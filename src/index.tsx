import './scss/app.scss' // 引入自定义样式文件
import { createRoot } from 'react-dom/client' // 导入 createRoot 方法用于创建 React 根节点
import { CustomToolbarRef, CustomToolbar } from './components/toolbar' // 导入自定义工具栏组件及其引用类型
import { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs' // 导入 PDF.js 相关组件和类型
import { createRef } from 'react' // 导入 React 的 createRef 方法
import { Painter } from './painter' // 导入画笔类
import { annotationDefinitions } from './const/definitions'

class PdfjsAnnotationExtension {
    PDFJS_PDFViewerApplication: PDFViewerApplication // PDF.js 的 PDFViewerApplication 对象
    PDFJS_EventBus: EventBus // PDF.js 的 EventBus 对象
    $PDFJS_sidebarContainer: HTMLDivElement // PDF.js 侧边栏容器
    $PDFJS_toolbar_container: HTMLDivElement // PDF.js 工具栏容器
    $PDFJS_viewerContainer: HTMLDivElement // PDF.js 页面视图容器
    customToolbarRef: React.RefObject<CustomToolbarRef> // 自定义工具栏的引用
    painter: Painter // 画笔实例

    constructor() {
        // 初始化 PDF.js 对象和相关属性
        this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
        this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
        this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
        this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
        this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
        // 使用 createRoot 方法创建 React 根节点，并渲染自定义工具栏组件
        this.customToolbarRef = createRef<CustomToolbarRef>()
        // 创建画笔实例
        this.painter = new Painter({
            PDFViewerApplication: this.PDFJS_PDFViewerApplication,
            PDFJS_EventBus: this.PDFJS_EventBus,
            setDefaultMode: () => {
                this.customToolbarRef.current.activeAnnotation(annotationDefinitions[0])
            }
        })
        // 初始化操作
        this.init()
    }
    /**
     * @description 初始化
     */
    private init() {
        this.coverStyle() // 添加自定义样式
        this.bindPdfjsEvent() // 绑定 PDF.js 事件
        this.renderToolbar() // 渲染工具栏
    }
    /**
     * @description 添加自定义样式
     */
    private coverStyle() {
        document.body.classList.add('PdfjsAnnotationExtension') // 添加自定义样式类到 body 元素
    }

    /**
     * @description 渲染工具栏
     */
    private renderToolbar() {
        const toolbar = document.createElement('div') // 创建工具栏容器元素
        this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', toolbar) // 将工具栏插入到 PDF.js 工具栏容器之后
        createRoot(toolbar).render(
            <CustomToolbar
                ref={this.customToolbarRef}
                onChange={(currentAnnotation, dataTransfer) => {
                    this.painter.activate(currentAnnotation, dataTransfer)
                }}
            ></CustomToolbar>
        )
    }

    private hidePdfjsEditorModeButtons() {
        const editorModeButtons = document.querySelector('#editorModeButtons') as HTMLDivElement
        const editorModeSeparator = document.querySelector('#editorModeSeparator') as HTMLDivElement
        editorModeButtons.style.display = 'none'
        editorModeSeparator.style.display = 'none'
    }

    /**
     * @description 绑定 PDF.js 事件
     */
    private bindPdfjsEvent() {
        this.hidePdfjsEditorModeButtons()
        // 监听 PDF.js 页面渲染完成事件
        this.PDFJS_EventBus._on(
            'pagerendered',
            async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
                this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
            }
        )
        // 监听PDF.js documentloaded 事件，完成后绑定WebSelection， 在id="viewer"元素上绑定
        this.PDFJS_EventBus._on('documentloaded', () => {
            this.painter.initWebSelection(this.$PDFJS_viewerContainer)
        })

        // 重置 Pdfjs AnnotationStorage 解决有嵌入图片打印、下载会ImageBitmap报错的问题
        this.PDFJS_EventBus._on('beforeprint', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
        this.PDFJS_EventBus._on('download', () => {
            this.painter.resetPdfjsAnnotationStorage()
        })
    }
}

new PdfjsAnnotationExtension()
