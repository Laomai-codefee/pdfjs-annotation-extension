import './index.scss' // 导入画笔样式文件
import Konva from 'konva'
import { EventBus, PageViewport, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { AnnotationType, IAnnotationContent, IAnnotationType, IPdfjsAnnotationStorage } from '../const/definitions'
import { WebSelection } from './webSelection'
import { Editor, IShapeGroup } from './editor/editor'
import { EditorRectangle } from './editor/editor_rectangle'
import { Store } from './store'
import { isElementInDOM, removeCssCustomProperty } from '../utils/utils'
import { EditorHighLight } from './editor/editor_highlight'
import { EditorEllipse } from './editor/editor_ellipse'
import { EditorFreeHand } from './editor/editor_free_hand'
import { EditorFreeHighlight } from './editor/editor_free_highlight'
import { EditorSignature } from './editor/editor_signature'
import { EditorStamp } from './editor/editor_stamp'
import { Selector } from './editor/selector'
import { CURSOR_CSS_PROPERTY, PAINTER_IS_PAINTING_STYLE, PAINTER_PAINTING_TYPE, PAINTER_WRAPPER_PREFIX } from './const'
import { EditorFreeText } from './editor/editor_free_text'

// KonvaCanvas 接口定义
export interface KonvaCanvas {
    pageNumber: number
    konvaStage: Konva.Stage
    wrapper: HTMLDivElement
    isActive: boolean
}

// Painter 类定义
export class Painter {
    private konvaCanvasStore: Map<number, KonvaCanvas> = new Map()
    private editorStore: Map<string, Editor> = new Map()
    private pdfViewerApplication: PDFViewerApplication
    private pdfjsEventBus: EventBus
    private webSelection: WebSelection
    private currentAnnotation: IAnnotationType | null = null
    private store: Store
    private selector: Selector
    private tempDataTransfer: string | null
    public readonly setDefaultMode: () => void

    /**
     * 构造函数，初始化 PDFViewerApplication, EventBus, 和 WebSelection
     * @param params - 包含 PDFViewerApplication 和 EventBus 的对象
     */
    constructor({
        PDFViewerApplication,
        PDFJS_EventBus,
        setDefaultMode
    }: {
        PDFViewerApplication: PDFViewerApplication
        PDFJS_EventBus: EventBus
        setDefaultMode: () => void
    }) {
        this.pdfViewerApplication = PDFViewerApplication
        this.pdfjsEventBus = PDFJS_EventBus
        this.setDefaultMode = setDefaultMode
        this.store = new Store({ PDFViewerApplication })
        this.selector = new Selector({
            konvaCanvasStore: this.konvaCanvasStore,
            getAnnotationStore: (id: string) => {
                return this.store.annotation(id)
            },
            onChange: async (id, groupString, rawAnnotationStore) => {
                const editor = this.findEditorForGroupId(id)
                if (editor) {
                    this.store.update(id, {
                        konvaString: groupString,
                        pdfjsAnnotationStorage: await editor.refreshPdfjsAnnotationStorage(id, groupString, rawAnnotationStore)
                    })
                }
            },
            onDelete: id => {
                this.deleteAnnotation(id)
            }
        })
        this.webSelection = new WebSelection({
            onSelect: (pageNumber, elements) => {
                const canvas = this.konvaCanvasStore.get(pageNumber)
                if (canvas) {
                    const { konvaStage, wrapper } = canvas
                    const editor = new EditorHighLight(
                        {
                            konvaStage,
                            pageNumber,
                            annotation: this.currentAnnotation,
                            onAdd: (shapeGroup, pdfjsAnnotationStorage, annotationContent) => {
                                this.saveToStore(shapeGroup, pdfjsAnnotationStorage, annotationContent)
                            }
                        },
                        this.currentAnnotation.type
                    )
                    this.editorStore.set(editor.id, editor)
                    editor.convertTextSelection(elements, wrapper)
                }
            }
        })
        this.bindGlobalEvents()
    }

    /**
     * 绑定全局事件。
     */
    private bindGlobalEvents(): void {
        window.addEventListener('keyup', this.globalKeyUpHandler)
    }

    /**
     * 全局键盘抬起事件处理器。
     * @param e - 键盘事件。
     */
    private globalKeyUpHandler = (e: KeyboardEvent): void => {
        if (e.code === 'Escape' && (this.currentAnnotation.type === AnnotationType.SIGNATURE || this.currentAnnotation.type === AnnotationType.STAMP)) {
            removeCssCustomProperty(CURSOR_CSS_PROPERTY)
            this.setDefaultMode()
        }
    }

    /**
     * 创建绘图容器 (painterWrapper)
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     * @returns 绘图容器元素
     */
    private createPainterWrapper(pageView: PDFPageView, pageNumber: number): HTMLDivElement {
        const wrapper = document.createElement('div')
        wrapper.id = `${PAINTER_WRAPPER_PREFIX}_page_${pageNumber}`
        wrapper.setAttribute('data-main-rotation', `${pageView.viewport.rotation}`)
        wrapper.classList.add(PAINTER_WRAPPER_PREFIX)

        const { width, height } = { width: pageView.viewport.viewBox[2], height: pageView.viewport.viewBox[3] }
        const scaleFactor = 'var(--scale-factor)'
        wrapper.style.width = `calc(${scaleFactor} * ${width}px)`
        wrapper.style.height = `calc(${scaleFactor} * ${height}px)`

        // 将绘图层容器添加到 PDF 页面容器中
        pageView.div.appendChild(wrapper)

        return wrapper
    }

    /**
     * 创建 Konva 舞台
     * @param container - 绘图容器元素
     * @param viewport - 当前 PDF 页面视口
     * @returns Konva 舞台对象
     */
    private createKonvaStage(container: HTMLDivElement, viewport: PageViewport): Konva.Stage {
        const stage = new Konva.Stage({
            container,
            width: viewport.width,
            height: viewport.height,
            rotation: viewport.rotation,
            scale: {
                x: viewport.scale,
                y: viewport.scale
            }
        })

        const backgroundLayer = new Konva.Layer()
        stage.add(backgroundLayer)

        return stage
    }

    /**
     * 清理无效的 canvasStore
     */
    private cleanUpInvalidStore(): void {
        this.konvaCanvasStore.forEach(konvaCanvas => {
            if (!isElementInDOM(konvaCanvas.wrapper)) {
                konvaCanvas.konvaStage.destroy()
                this.konvaCanvasStore.delete(konvaCanvas.pageNumber)
            }
        })
    }

    /**
     * 插入新的绘图容器和 Konva 舞台
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     */
    private insertCanvas(pageView: PDFPageView, pageNumber: number): void {
        this.cleanUpInvalidStore()
        const painterWrapper = this.createPainterWrapper(pageView, pageNumber)
        const konvaStage = this.createKonvaStage(painterWrapper, pageView.viewport)

        this.konvaCanvasStore.set(pageNumber, {
            pageNumber,
            konvaStage,
            wrapper: painterWrapper,
            isActive: false
        })
        this.reDrawAnnotation(pageNumber)
        this.enablePainting()
    }

    /**
     * 调整现有 KonvaCanvas 的缩放
     * @param pageView - 当前 PDF 页面视图
     * @param pageNumber - 当前页码
     */
    private scaleCanvas(pageView: PDFPageView, pageNumber: number): void {
        const konvaCanvas = this.konvaCanvasStore.get(pageNumber)
        if (!konvaCanvas) return

        const { konvaStage } = konvaCanvas
        const { scale, width, height } = pageView.viewport

        konvaStage.scale({ x: scale, y: scale })
        konvaStage.width(width)
        konvaStage.height(height)
    }

    /**
     * 设置当前模式 (选择模式、绘画模式、默认模式)
     * @param mode - 模式类型 ('selection', 'painting', 'default')
     */
    private setMode(mode: 'selection' | 'painting' | 'default'): void {
        const isPainting = mode === 'painting'
        const isSelection = mode === 'selection'
        this.webSelection[isSelection ? 'enable' : 'disable']()
        document.body.classList.toggle(`${PAINTER_IS_PAINTING_STYLE}`, isPainting)
        const allAnnotationClasses = Object.values(AnnotationType)
            .filter(type => typeof type === 'number')
            .map(type => `${PAINTER_PAINTING_TYPE}_${type}`)
        // 移除所有可能存在的批注类型样式
        allAnnotationClasses.forEach(cls => document.body.classList.remove(cls))
        // 移出签名鼠标指针变量
        removeCssCustomProperty(CURSOR_CSS_PROPERTY)
        if (this.currentAnnotation) {
            document.body.classList.add(`${PAINTER_PAINTING_TYPE}_${this.currentAnnotation?.type}`)
        }
    }

    private saveToStore(shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        this.store.save(shapeGroup, pdfjsAnnotationStorage, annotationContent)
    }

    private findEditorForGroupId(groupId: string) {
        let editor: Editor = null
        this.editorStore.forEach(_editor => {
            if (_editor.shapeGroupStore?.has(groupId)) {
                editor = _editor
                return
            }
        })
        return editor
    }

    private findEditor(pageNumber: number, editorType: AnnotationType): Editor {
        return this.editorStore.get(`${pageNumber}_${editorType}`)
    }

    /**
     * 启用特定类型的编辑器
     * @param options - 包含 Konva 舞台, 页码 和 注释类型的对象
     */
    private enableEditor({ konvaStage, pageNumber, annotation }: { konvaStage: Konva.Stage; pageNumber: number; annotation: IAnnotationType }): void {
        const storeEditor = this.findEditor(pageNumber, annotation.type)
        if (storeEditor) {
            if (storeEditor instanceof EditorSignature) {
                storeEditor.activateWithSignature(konvaStage, annotation, this.tempDataTransfer)
                return
            }
            if (storeEditor instanceof EditorStamp) {
                storeEditor.activateWithStamp(konvaStage, annotation, this.tempDataTransfer)
                return
            }
            storeEditor.activate(konvaStage, annotation)
            return
        }
        let editor: Editor | null = null
        switch (annotation.type) {
            case AnnotationType.FREETEXT:
                editor = new EditorFreeText({
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: (shapeGroup, pdfjsAnnotationStorage, annotationContent) => {
                        this.saveToStore(shapeGroup, pdfjsAnnotationStorage, annotationContent)
                    }
                })
                break
            case AnnotationType.RECTANGLE:
                editor = new EditorRectangle({
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: (shapeGroup, pdfjsAnnotationStorage) => {
                        this.saveToStore(shapeGroup, pdfjsAnnotationStorage)
                    }
                })
                break

            case AnnotationType.ELLIPSE:
                editor = new EditorEllipse({
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: (shapeGroup, pdfjsAnnotationStorage) => {
                        this.saveToStore(shapeGroup, pdfjsAnnotationStorage)
                    }
                })
                break
            case AnnotationType.FREEHAND:
                editor = new EditorFreeHand({
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: (shapeGroup, pdfjsAnnotationStorage) => {
                        this.saveToStore(shapeGroup, pdfjsAnnotationStorage)
                    }
                })
                break
            case AnnotationType.FREE_HIGHLIGHT:
                editor = new EditorFreeHighlight({
                    konvaStage,
                    pageNumber,
                    annotation,
                    onAdd: (shapeGroup, pdfjsAnnotationStorage) => {
                        this.saveToStore(shapeGroup, pdfjsAnnotationStorage)
                    }
                })
                break
            case AnnotationType.SIGNATURE:
                editor = new EditorSignature(
                    {
                        konvaStage,
                        pageNumber,
                        annotation,
                        onAdd: (shapeGroup, pdfjsAnnotationStorage, annotationContent) => {
                            this.saveToStore(shapeGroup, pdfjsAnnotationStorage, annotationContent)
                            if (annotation.isOnce) {
                                this.setDefaultMode()
                                this.selector.selected(shapeGroup.id)
                            }
                        }
                    },
                    this.tempDataTransfer
                )
                break
            case AnnotationType.STAMP:
                editor = new EditorStamp(
                    {
                        konvaStage,
                        pageNumber,
                        annotation,
                        onAdd: (shapeGroup, pdfjsAnnotationStorage, annotationContent) => {
                            this.saveToStore(shapeGroup, pdfjsAnnotationStorage, annotationContent)
                            if (annotation.isOnce) {
                                this.setDefaultMode()
                                this.selector.selected(shapeGroup.id)
                            }
                        }
                    },
                    this.tempDataTransfer
                )
                break
            case AnnotationType.SELECT:
                this.selector.activate(pageNumber)
                break

            default:
                console.warn(`未实现的注释类型: ${annotation.type}`)
                return
        }

        if (editor) {
            this.editorStore.set(editor.id, editor)
        }
    }

    /**
     * 启用批注
     */
    private enablePainting(): void {
        this.konvaCanvasStore.forEach(({ konvaStage, pageNumber }) => {
            if (this.currentAnnotation) {
                this.enableEditor({
                    konvaStage,
                    pageNumber,
                    annotation: this.currentAnnotation
                })
            }
        })
    }

    private reDrawAnnotation(pageNumber: number) {
        const konvaCanvasStore = this.konvaCanvasStore.get(pageNumber)
        const annotationStores = this.store.getByPage(pageNumber)
        annotationStores.forEach(annotationStore => {
            const storeEditor = this.findEditor(pageNumber, annotationStore.type)
            if (storeEditor) {
                storeEditor.addSerializedGroupToLayer(konvaCanvasStore.konvaStage, annotationStore.konvaString)
            }
        })
    }

    private deleteAnnotation(id) {
        const annotationStore = this.store.annotation(id)
        if (!annotationStore) {
            return
        }
        this.store.delete(id)
        const storeEditor = this.findEditor(annotationStore.pageNumber, annotationStore.type)
        if (storeEditor) {
            storeEditor.deleteGroup(id)
        }
    }

    /**
     * 关闭批注
     */
    private disablePainting(): void {
        this.setMode('default')
        this.clearTempDataTransfer()
        this.selector.clear()
        console.log('Painting mode disabled')
    }

    private saveTempDataTransfer(data: string) {
        this.tempDataTransfer = data
        return this.tempDataTransfer
    }

    private clearTempDataTransfer() {
        this.tempDataTransfer = null
        return this.tempDataTransfer
    }

    /**
     * 初始化或更新 KonvaCanvas
     * @param params - 包含当前 PDF 页面视图, 是否需要缩放和页码的对象
     */
    public initCanvas({ pageView, cssTransform, pageNumber }: { pageView: PDFPageView; cssTransform: boolean; pageNumber: number }): void {
        if (cssTransform) {
            this.scaleCanvas(pageView, pageNumber)
        } else {
            this.insertCanvas(pageView, pageNumber)
        }
    }

    /**
     * 初始化 WebSelection
     * @param rootElement - 根 DOM 元素
     */
    public initWebSelection(rootElement: HTMLDivElement): void {
        this.webSelection.create(rootElement)
    }

    /**
     * 激活特定注释类型的方法
     * @param annotation - 注释类型对象
     */
    public activate(annotation: IAnnotationType | null, dataTransfer: string | null): void {
        this.currentAnnotation = annotation
        this.disablePainting()
        this.saveTempDataTransfer(dataTransfer)
        if (!annotation) {
            return
        }
        console.log(`Painting mode active type: ${annotation.type} | pdfjs annotationStorage type: ${annotation.pdfjsType}`)
        switch (annotation.type) {
            case AnnotationType.HIGHLIGHT:
            case AnnotationType.STRIKEOUT:
            case AnnotationType.UNDERLINE:
                this.setMode('selection')
                break

            case AnnotationType.FREETEXT:
            case AnnotationType.RECTANGLE:
            case AnnotationType.ELLIPSE:
            case AnnotationType.FREEHAND:
            case AnnotationType.FREE_HIGHLIGHT:
            case AnnotationType.SIGNATURE:
            case AnnotationType.STAMP:
            case AnnotationType.SELECT:
                this.setMode('painting')
                break

            default:
                this.setMode('default')
                break
        }

        this.enablePainting()
    }

    public resetPdfjsAnnotationStorage() {
        this.store.resetAnnotationStorage()
    }
}
