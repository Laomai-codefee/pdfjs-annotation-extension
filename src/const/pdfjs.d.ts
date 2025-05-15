declare module 'pdfjs' {
    interface PDFViewerApplication {
        appConfig: AppConfig
        page: number
        eventBus: EventBus
        pdfViewer: PDFPageView
        pagesCount: number
        _title: string
        _downloadUrl: string
        [key: string]: any // 其他未知属性的类型定义
    }
    interface Sidebar {
        outerContainer: HTMLDivElement
        sidebarContainer: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    interface Toolbar {
        container: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    interface AppConfig {
        sidebar: Sidebar
        toolbar: Toolbar
        viewerContainer: HTMLDivElement
        mainContainer: HTMLDivElement
        [key: string]: any // 其他未知属性的类型定义
    }
    interface PDFPageView {
        id: number
        div: HTMLDivElement
        viewport: PageViewport
        [key: string]: any // 其他未知属性的类型定义
    }
    interface PageViewport {
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
    interface EventBus {
        [key: string]: any // 其他未知属性的类型定义
    }
    type Subtype =
        | 'Link'
        | 'Text'
        | 'Widget'
        | 'Popup'
        | 'FreeText'
        | 'Line'
        | 'Square'
        | 'Circle'
        | 'PolyLine'
        | 'Polygon'
        | 'Caret'
        | 'Ink'
        | 'Highlight'
        | 'Underline'
        | 'Squiggly'
        | 'StrikeOut'
        | 'Stamp'
        | 'FileAttachment'
    type AnnotationType =
        | 1 // TEXT
        | 2 // LINK
        | 3 // FREETEXT
        | 4 // LINE
        | 5 // SQUARE
        | 6 // CIRCLE
        | 7 // POLYGON
        | 8 // POLYLINE
        | 9 // HIGHLIGHT
        | 10 // UNDERLINE
        | 11 // SQUIGGLY
        | 12 // STRIKEOUT
        | 13 // STAMP
        | 14 // CARET
        | 15 // INK
        | 16 // POPUP
        | 17 // FILEATTACHMENT
        | 18 // SOUND
        | 19 // MOVIE
        | 20 // WIDGET
        | 21 // SCREEN
        | 22 // PRINTERMARK
        | 23 // TRAPNET
        | 24 // WATERMARK
        | 25 // THREED
        | 26 // REDACT

    interface Annotation {
        annotationFlags: number
        borderStyle: BorderStyle
        color: RGBColor | null
        backgroundColor: RGBColor | null
        borderColor: RGBColor | null
        rotation: number
        contentsObj: ContentObject
        hasAppearance: boolean
        id: string
        modificationDate: string | null
        rect: [number, number, number, number]
        subtype: Subtype
        hasOwnCanvas: boolean
        noRotate: boolean
        noHTML: boolean
        titleObj: TitleObject
        creationDate: string | null
        popupRef: string | null
        annotationType: AnnotationType
        pageNumber: number
        inReplyTo?: string
        pageViewer: PDFPageView
    }

    interface BorderStyle {
        width: number
        style: number
        dashArray: number[]
        horizontalCornerRadius: number
        verticalCornerRadius: number
    }

    interface RGBColor {
        0: number
        1: number
        2: number
    }

    interface ContentObject {
        str: string
        dir: string
    }

    interface TitleObject {
        str: string
        dir: string
    }

    interface DefaultAppearanceData {
        fontSize: number
        fontName: string
        fontColor: RGBColor
    }

    interface RichText {
        html: HtmlObject
        str: string
    }

    interface HtmlObject {
        name: string
        attributes: HtmlAttributes
        children: HtmlChild[]
    }

    interface HtmlAttributes {
        style: Record<string, string>
        class: string[]
        dir: string
    }

    interface HtmlChild {
        name: string
        attributes: HtmlAttributes
        children: HtmlChild[]
        value?: string
    }

    interface QuadPoint {
        x: number
        y: number
    }

    interface InkList {
        x: number
        y: number
    }

    interface Vertices {
        x: number
        y: number
    }

    // FreeText Annotation with rich text and appearance data
    interface FreeTextAnnotation extends Annotation {
        annotationType: 3
        defaultAppearanceData: DefaultAppearanceData
        textContent: string[]
        textPosition: [number, number]
        richText?: RichText
    }

    // Highlight annotation with quad points
    interface HighlightAnnotation extends Annotation {
        annotationType: 9
        quadPoints: QuadPoint[][]
    }

    // Square annotation
    interface SquareAnnotation extends Annotation {
        annotationType: 5
    }

    // Circle annotation
    interface CircleAnnotation extends Annotation {
        annotationType: 6
    }

    // Ink annotation with ink lists
    interface InkAnnotation extends Annotation {
        annotationType: 15
        inkLists: InkList[][]
    }

    // Line annotation with coordinates and endings
    interface LineAnnotation extends Annotation {
        annotationType: 4
        lineCoordinates: [number, number, number, number]
        lineEndings: [string, string]
    }

    // Polygon annotation
    interface PolygonAnnotation extends Annotation {
        annotationType: 7
        vertices: Vertices[]
    }

    // Polyline annotation
    interface PolyLineAnnotation extends Annotation {
        annotationType: 8
        lineEndings: [string, string]
        vertices: Vertices[]
    }

    // Text annotation
    interface TextAnnotation extends Annotation {
        annotationType: 1
        inReplyTo?: string
        replyType?: string
        [key: string]: any
    }

    // Underline annotation with quad points
    interface UnderlineAnnotation extends Annotation {
        annotationType: 10
        quadPoints: QuadPoint[][]
    }

    // StrikeOut annotation with quad points
    interface StrikeOutAnnotation extends Annotation {
        annotationType: 12
        quadPoints: QuadPoint[][]
    }
}
