import './scss/app.scss'

import { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeI18n } from './locale/index'
import { CustomPopbar, CustomPopbarRef } from './components/popbar'
import { CustomToolbar, CustomToolbarRef } from './components/toolbar'
import { annotationDefinitions, DefaultSettings } from './const/definitions'
import { Painter } from './painter'
import { CustomComment, CustomCommentRef } from './components/comment'

class PdfjsAnnotationExtension {
    PDFJS_PDFViewerApplication: PDFViewerApplication // PDF.js 的 PDFViewerApplication 对象
    PDFJS_EventBus: EventBus // PDF.js 的 EventBus 对象
    $PDFJS_mainContainer: HTMLDivElement
    $PDFJS_sidebarContainer: HTMLDivElement // PDF.js 侧边栏容器
    $PDFJS_toolbar_container: HTMLDivElement // PDF.js 工具栏容器
    $PDFJS_viewerContainer: HTMLDivElement // PDF.js 页面视图容器
    customToolbarRef: React.RefObject<CustomToolbarRef> // 自定义工具栏的引用
    customPopbarRef: React.RefObject<CustomPopbarRef>
    customCommentRef: React.RefObject<CustomCommentRef>
    painter: Painter // 画笔实例

    constructor() {

        // 初始化 PDF.js 对象和相关属性
        this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
        this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
        this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
        this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
        this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
        this.$PDFJS_mainContainer = this.PDFJS_PDFViewerApplication.appConfig.mainContainer
        // 使用 createRef 方法创建 React 引用
        this.customToolbarRef = createRef<CustomToolbarRef>()
        this.customPopbarRef = createRef<CustomPopbarRef>()
        this.customCommentRef = createRef<CustomCommentRef>()
        // 加载多语言
        initializeI18n(this.PDFJS_PDFViewerApplication.l10n.getLanguage())

        // 创建画笔实例
        this.painter = new Painter({
            PDFViewerApplication: this.PDFJS_PDFViewerApplication,
            PDFJS_EventBus: this.PDFJS_EventBus,
            setDefaultMode: () => {
                this.customToolbarRef.current.activeAnnotation(annotationDefinitions[0])
            },
            onWebSelectionSelected: range => {
                this.customPopbarRef.current.open(range)
            },
            onStoreChange: annotation => {
                this.customCommentRef.current.addAnnotation(annotation)
            },
            onAnnotationSelected: annotation => {
                this.customCommentRef.current.selectedAnnotation(annotation)
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
        this.renderComment()
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
                onDownload={() => {
                    this.downLoadPdf()
                }}
                onSave={() => {
                    this.savePdf()
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
                    this.painter.highlightRange(range, currentAnnotation)
                }}
            />
        )
    }

    /**
     * @description 渲染自定义留言条
     */
    private renderComment(): void {
        const comment = document.createElement('div')
        this.$PDFJS_mainContainer.insertAdjacentElement('afterend', comment)
        createRoot(comment).render(
            <CustomComment
                ref={this.customCommentRef}
                onSelected={async (annotation) => {
                    await this.painter.highlight(annotation)
                }}
                onDelete={(id) => {
                    this.painter.delete(id)
                }}
                onUpdate={(annotation) => {
                    this.painter.update(annotation.id, {
                        title: annotation.title,
                        contentsObj: annotation.contentsObj,
                        comments: annotation.comments
                    })
                }}
            />
        )
    }

    /**
     * @description 隐藏 PDF.js 编辑模式按钮
     */
    private hidePdfjsEditorModeButtons(): void {
        DefaultSettings.HIDE_PDFJS_ELEMENT.forEach(item => {
            const element = document.querySelector(item) as HTMLElement;
            if (element) {
                element.style.display = 'none';
                const nextDiv = element.nextElementSibling as HTMLElement;
                if (nextDiv.classList.contains('horizontalToolbarSeparator')) {
                    nextDiv.style.display = 'none'
                }
            }
        });
    }

    /**
     * @description 隐藏绘图层
     */
    private hidePainter() {
        document.body.classList.add('PdfjsAnnotationExtension_scalechanging')
    }

    /**
     * @description 显示绘图层
     */
    private showPainter() {
        document.body.classList.remove('PdfjsAnnotationExtension_scalechanging')
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
                this.showPainter()
                this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
            }
        )
        // 缩放页面时隐藏绘图层
        this.PDFJS_EventBus._on('scalechanging', () => {
            this.hidePainter()
        })
        // 监听文档加载完成事件
        this.PDFJS_EventBus._on('documentloaded', async (source) => {
            this.painter.initWebSelection(this.$PDFJS_viewerContainer)
            await this.painter.saveOriginalAnnotations()
        })
        // 重置 Pdfjs AnnotationStorage 解决有嵌入图片打印、下载会ImageBitmap报错的问题
        this.PDFJS_EventBus._on('beforeprint', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
        this.PDFJS_EventBus._on('download', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
    }

    private async savePdf() {
        this.painter.resetPdfjsAnnotationStorage()
        const fileName = this.PDFJS_PDFViewerApplication._title || '未命名.pdf'
        // 保存到远程地址
        const data = await this.PDFJS_PDFViewerApplication?.pdfDocument?.saveDocument()
        const blob = new Blob([data], { type: 'application/pdf' })
        const formData = new FormData()
        formData.append('file', blob, fileName)
        fetch('save.action', {
            method: 'POST',
            body: formData
        })
    }

    private async downLoadPdf() {
        this.PDFJS_EventBus.dispatch("download")
    }
}

new PdfjsAnnotationExtension()
