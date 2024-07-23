declare module 'pdfjs' {
    /**
    在 PDF.js 中，PDFViewerApplication 是一个重要的对象，它代表了整个 PDF 查看器的应用程序。
    它是 PDF.js 中核心的控制器，负责管理 PDF 文档的加载、渲染、交互等方面的逻辑。
    PDFViewerApplication 对象通常包含了许多方法和属性，用于控制 PDF 文档的各种功能。
    一般来说，你可以通过 PDFViewerApplication 对象来执行诸如加载 PDF 文档、跳转页面、放大缩小、搜索文本等操作。
    通常情况下，你可以通过全局变量 PDFViewerApplication 来访问 PDFViewerApplication 对象，然后调用其相应的方法和属性来执行所需的操作。
    */
    export interface PDFViewerApplication {
        appConfig: AppConfig
        page: number
        eventBus: EventBus
        pdfViewer: PDFPageView
        pagesCount: number
        [key: string]: any // 其他未知属性的类型定义
    }
    /**
    在 PDF.js 中，Sidebar 是一个对象，用于管理 PDF 查看器的侧边栏。
    侧边栏通常包含了一些用于导航和查看 PDF 文档的辅助功能，例如缩略图、大纲、附件等。
    Sidebar 对象包含了一些属性和方法，用于控制侧边栏的显示和行为。
    通过 Sidebar 对象，你可以管理侧边栏的打开/关闭状态，以及其中各个功能组件的显示和交互。
    以下是一些可能包含在 Sidebar 对象中的属性和方法：
    outerContainer: 指定侧边栏的外部容器元素。
    sidebarContainer: 指定侧边栏内容的容器元素。
    toggleButton: 指定用于切换侧边栏显示/隐藏状态的按钮。
    resizer: 指定用于调整侧边栏宽度的调整器。
    thumbnailButton: 指定用于显示缩略图的按钮。
    outlineButton: 指定用于显示大纲的按钮。
    attachmentsButton: 指定用于显示附件的按钮。
    layersButton: 指定用于显示图层的按钮。
    thumbnailView: 控制缩略图视图的显示和交互。
    outlineView: 控制大纲视图的显示和交互。
    attachmentsView: 控制附件视图的显示和交互。
    layersView: 控制图层视图的显示和交互。
    currentOutlineItemButton: 指定当前大纲项的按钮。
    通过使用 Sidebar 对象，你可以对 PDF 查看器的侧边栏进行定制和控制，以实现更好的用户体验和交互效果。
    */
    export interface Sidebar {
        outerContainer: HTMLDivElement
        sidebarContainer: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    /**
    在 PDF.js 中，工具栏（Toolbar）是用于控制 PDF 查看器各种功能的界面元素集合。它通常位于 PDF 查看器的顶部或底部，并包含了一系列按钮、下拉菜单和输入框等组件，用于执行各种操作，如跳转页面、放大缩小、搜索文本等。
    PDF.js 中的工具栏（Toolbar）包含了一些重要的组件和功能，例如：
    跳转到特定页码的输入框和按钮。
    缩放选项，包括放大、缩小以及自定义缩放比例。
    查找文本的输入框和按钮。
    打印和下载 PDF 文档的按钮。
    PDF 文档注释工具、标记工具等。
    以下是可能包含在 PDF.js 工具栏中的一些组件和功能：
    container: 工具栏的容器元素。
    numPages: 显示 PDF 文档的总页数。
    pageNumber: 显示当前页码，并提供跳转到特定页码的输入框。
    scaleSelect: 放大缩小选项，包括预定义的缩放比例和自定义缩放比例输入框。
    viewFind: 查找文本的输入框和按钮。
    print: 打印 PDF 文档的按钮。
    download: 下载 PDF 文档的按钮。
    通过使用工具栏（Toolbar），用户可以方便地控制 PDF 查看器的各种功能，从而实现更加舒适和高效的 PDF 文档浏览体验。
    */
    export interface Toolbar {
        container: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    /**
    在 PDF.js 中，AppConfig 是一个对象，用于配置 PDF 查看器应用程序的各种设置和选项。
    它通常包含了一些用于定制 PDF 查看器外观和行为的属性。
    AppConfig 对象通常在 PDF 查看器应用程序初始化时被使用，用于指定各种配置选项，以便根据实际需求来定制 PDF 查看器的行为。
    以下是一些可能包含在 AppConfig 对象中的配置选项：
    viewerContainer: 指定 PDF 查看器的容器元素。
    toolbar: 配置 PDF 查看器的工具栏，包括按钮、菜单项等。
    secondaryToolbar: 配置 PDF 查看器的次要工具栏，通常包含一些不常用的功能按钮。
    sidebar: 配置 PDF 查看器的侧边栏，包括缩略图、大纲等。
    findBar: 配置 PDF 查看器的查找栏，用于搜索文本。
    passwordOverlay: 配置 PDF 查看器的密码输入框，用于打开受密码保护的 PDF 文档。
    documentProperties: 配置 PDF 查看器的文档属性对话框，用于显示文档的元数据信息。
    debuggerScriptPath: 配置 PDF 查看器的调试器脚本路径。
    通过配置 AppConfig 对象，你可以自定义 PDF 查看器的外观和行为，以满足特定的需求。这些配置选项通常可以在初始化 PDF 查看器应用程序时进行指定。
    */
    export interface AppConfig {
        sidebar: Sidebar
        toolbar: Toolbar
        viewerContainer: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    /**
     * PDFPageView 是表示 PDF 页面视图的对象。
     * 它用于管理和渲染 PDF 文档的单个页面。
     * PDFPageView 对象包含了页面的各种信息，例如页面的尺寸、内容、注释等，并提供了方法来管理和操作页面，如渲染页面内容、添加注释等。
     */
    export interface PDFPageView {
        id: number
        div: HTMLDivElement
        viewport: PageViewport
        [key: string]: any // 其他未知属性的类型定义
    }
    /**
在 PDF.js 中，PageViewport 是一个表示 PDF 页面视口的对象。它描述了 PDF 页面在浏览器窗口中的位置、尺寸和缩放比例等信息。
PageViewport 对象通常由 PDF.js 提供的渲染引擎计算得出，用于在将 PDF 页面渲染到屏幕上时确定页面的适当位置和大小。
以下是 PageViewport 可能包含的一些属性：
viewBox: 表示 PDF 页面的边界框，通常是一个包含四个数字的数组，表示页面的左上角和右下角的坐标。
scale: 表示页面的缩放比例。
rotation: 表示页面的旋转角度。
offsetX 和 offsetY: 表示页面在 PDF 文档中的偏移量。
width 和 height: 表示页面在浏览器窗口中的宽度和高度。
通过 PageViewport 对象，你可以了解到 PDF 页面在渲染时的各种属性，以便进行正确的显示和操作。
 */
    export interface PageViewport {
        viewBox: [number, number, number, number]
        scale: number
        rotation: number
        offsetX: number
        offsetY: number
        transform: [number, number, number, number, number, number]
        width: number
        height: number
        rawDims: {
            pageWidth: number
            pageHeight: number
            pageX: number
            pageY: number
        }
    }

    /**
在 PDF.js 中，eventBus 是一个用于处理 PDF 文档渲染过程中的事件的重要组件。
它充当了事件总线的角色，负责在不同部件之间传递和处理事件
通过 eventBus，你可以监听和响应各种 PDF 渲染相关的事件，例如文档加载完成、页面渲染完成、页面缩放、滚动等等。
这些事件可以帮助你更好地控制 PDF 文档的交互和行为。
以下是一些常见的 PDF.js 中的事件：
pagesinit：当 PDF 文档的所有页面初始化完成时触发。
pagerendered：当页面渲染完成时触发。
textlayerrendered：当文本图层渲染完成时触发。
scalechange：当页面缩放改变时触发。
updateviewarea：当视图区域更新时触发，通常用于监听滚动事件。
你可以通过监听这些事件，并在事件触发时执行相应的操作，以实现你所需的 PDF 文档交互效果。
 */
    export interface EventBus {
        [key: string]: any // 其他未知属性的类型定义
    }
}
