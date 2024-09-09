import './scss/app.scss'

import { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { createRef } from 'react'
import { createRoot } from 'react-dom/client'

import { CustomPopbar, CustomPopbarRef } from './components/popbar'
import { CustomToolbar, CustomToolbarRef } from './components/toolbar'
import { annotationDefinitions } from './const/definitions'
import { Painter } from './painter'

class PdfjsAnnotationExtension {
    PDFJS_PDFViewerApplication: PDFViewerApplication // PDF.js 的 PDFViewerApplication 对象
    PDFJS_EventBus: EventBus // PDF.js 的 EventBus 对象
    $PDFJS_sidebarContainer: HTMLDivElement // PDF.js 侧边栏容器
    $PDFJS_toolbar_container: HTMLDivElement // PDF.js 工具栏容器
    $PDFJS_viewerContainer: HTMLDivElement // PDF.js 页面视图容器
    customToolbarRef: React.RefObject<CustomToolbarRef> // 自定义工具栏的引用
    customPopbarRef: React.RefObject<CustomPopbarRef>
    painter: Painter // 画笔实例

    constructor() {
        // 初始化 PDF.js 对象和相关属性
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
        this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
        this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
        this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
        this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
        // 使用 createRef 方法创建 React 引用
        this.customToolbarRef = createRef<CustomToolbarRef>()
        this.customPopbarRef = createRef<CustomPopbarRef>()
        // 创建画笔实例
        this.painter = new Painter({
            PDFViewerApplication: this.PDFJS_PDFViewerApplication,
            PDFJS_EventBus: this.PDFJS_EventBus,
            setDefaultMode: () => {
                this.customToolbarRef.current.activeAnnotation(annotationDefinitions[0])
            },
            onWebSelectionSelected: range => {
                this.customPopbarRef.current.open(range)
            }
        })
        // 初始化操作
        this.init()
    }

    /**
     * @description 初始化 PdfjsAnnotationExtension 类
     */
    private init(): void {
        this.addCustomStyle()
        this.bindPdfjsEvents()
        this.renderToolbar()
        this.renderPopBar()
    }

    /**
     * @description 添加自定义样式
     */
    private addCustomStyle(): void {
        document.body.classList.add('PdfjsAnnotationExtension')
    }

    /**
     * @description 渲染自定义工具栏
     */
    private renderToolbar(): void {
        const toolbar = document.createElement('div')
        this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', toolbar)
        createRoot(toolbar).render(
            <CustomToolbar
                ref={this.customToolbarRef}
                onChange={(currentAnnotation, dataTransfer) => {
                    this.painter.activate(currentAnnotation, dataTransfer)
                }}
            />
        )
    }

    /**
     * @description 渲染自定义弹出工具条
     */
    private renderPopBar(): void {
        const popbar = document.createElement('div')
        this.$PDFJS_viewerContainer.insertAdjacentElement('afterend', popbar)
        createRoot(popbar).render(
            <CustomPopbar
                ref={this.customPopbarRef}
                onChange={(currentAnnotation, range) => {
                    this.painter.highlight(range, currentAnnotation)
                }}
            />
        )
    }

    /**
     * @description 隐藏 PDF.js 编辑模式按钮
     */
    private hidePdfjsEditorModeButtons(): void {
        const editorModeButtons = document.querySelector('#editorModeButtons') as HTMLDivElement
        const editorModeSeparator = document.querySelector('#editorModeSeparator') as HTMLDivElement
        editorModeButtons.style.display = 'none'
        editorModeSeparator.style.display = 'none'
    }

    /**
     * @description 绑定 PDF.js 相关事件
     */
    private bindPdfjsEvents(): void {
        this.hidePdfjsEditorModeButtons()
        // 监听页面渲染完成事件
        this.PDFJS_EventBus._on(
            'pagerendered',
            async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
                this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
            }
        )
        // 监听文档加载完成事件
        this.PDFJS_EventBus._on('documentloaded', (event) => {
            this.painter.initWebSelection(this.$PDFJS_viewerContainer)
        })
        // 重置 Pdfjs AnnotationStorage 解决有嵌入图片打印、下载会ImageBitmap报错的问题
        this.PDFJS_EventBus._on('beforeprint', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
        this.PDFJS_EventBus._on('download', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
        this.PDFJS_EventBus._on('updateviewarea', () => {
            // this.customPopbarRef.current.close()
        })
    }
}

new PdfjsAnnotationExtension()
