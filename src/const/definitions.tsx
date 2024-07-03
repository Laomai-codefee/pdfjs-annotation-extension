import { EllipseIcon, FreehandIcon, FreeHighlightIcon, FreetextIcon, HighlightIcon, RectangleIcon, SelectIcon, SignatureIcon, StampIcon, StrikeoutIcon, UnderlineIcon } from './icon'

/**
 * 描述批注路径数据的接口
 */
interface IPathData {
    /**
     * 贝塞尔曲线的控制点数组
     * 通常是 4 个或 8 个数值表示控制点坐标
     */
    bezier?: number[]

    /**
     * 路径上的关键点数组
     */
    points?: number[]
}
/**
 * PDF.js 批注存储接口定义
 */
export interface IPdfjsAnnotationStorage {
    /**
     * 批注的类型
     */
    annotationType: PdfjsAnnotationEditorType
    /**
     * 批注颜色，使用 [R, G, B] 数组表示
     */
    color?: [number, number, number]
    /**
     * 批注的线条粗细
     */
    thickness?: number
    /**
     * 批注的不透明度 (0.0 - 1.0)
     */
    opacity?: number
    /**
     * 描述批注的路径数据数组
     */
    paths?: IPathData[]
    /**
     * 批注所在的页面索引（从0开始）
     */
    pageIndex: number

    /**
     * 批注的边界矩形，以 [x, y, width, height] 表示
     * 可选，因为并非所有批注类型都需要这个属性
     */
    rect?: [number, number, number, number]

    quadPoints?: number[]

    outlines?: number[][]

    /**
     * 批注的旋转角度（度数）
     * 可选，因为并非所有批注类型都需要旋转属性
     */
    rotation?: number

    bitmapId?: string

    bitmap?: ImageBitmap

    bitmapName?: string

    bitmapUrl?: string

    isSvg?: boolean

    structTreeParentId?: string
}

// PDF.js 自带的批注编辑器类型枚举
export enum PdfjsAnnotationEditorType {
    DISABLE = -1,
    NONE = 0,
    FREETEXT = 3,
    HIGHLIGHT = 9,
    STAMP = 13,
    INK = 15
}

// 自定义的批注类型枚举
export enum AnnotationType {
    NONE = -1,
    SELECT = 0,
    HIGHLIGHT = 1,
    STRIKEOUT = 2,
    UNDERLINE = 3,
    FREETEXT = 4,
    RECTANGLE = 5,
    ELLIPSE = 6,
    FREEHAND = 7,
    FREE_HIGHLIGHT = 8,
    SIGNATURE = 9,
    STAMP = 10
}

// 配置默认颜色
export const DefaultColors = ['#FF0000', '#FFBE00', '#CC0000', , '#FFFF00', '#83D33C', '#00B445', '#00B2F4', '#0071C4', '#001F63', '#7828A4']

export const DefaultFontSize = [16, 18, 20, 22, 24]

export const DefaultSignatureSetting = {
    COLORS: ['#000000', '#FF0000'],
    WIDTH: 128 * 3,
    HEIGHT: 128
}

export const DefaultChooseSetting = {
    COLOR: '#0071C4',
    STROKEWIDTH: 2
}

// 默认配置对象
export const DefaultSettings = {
    COLOR: DefaultColors[0],
    FONT_SIZE: DefaultFontSize[0],
    HIGHLIGHT_COLOR: DefaultColors[1],
    STRIKEOUT_COLOR: DefaultColors[0],
    UNDERLINE_COLOR: DefaultColors[6],
    STROKE_WIDTH: 2,
    OPACITY: 1,
    MAX_CURSOR_SIZE: 96 // 鼠标指针图片最大宽度/高度
}

// 定义批注类型的接口
export interface IAnnotationType {
    name: string // 批注的名称
    type: AnnotationType // 自定义的批注类型
    pdfjsType: PdfjsAnnotationEditorType // 对应的 Pdfjs 批注类型
    isOnce: boolean // 是否只绘制一次
    readonly: boolean // 绘制的图形是否可以调整修改
    icon?: React.JSX.Element // 可选的图标
    style?: IAnnotationStyle // 可选的样式配置对象
}

// 批注的样式配置接口
export interface IAnnotationStyle {
    color?: string // 线条、文本、填充的颜色
    fontSize?: number // 字体大小
    opacity?: number // 透明度
    strokeWidth?: number // 边框宽度
}

export interface IAnnotationContent {
    text?: string
    image?: string
}

export interface IAnnotationStore {
    id: string
    pageNumber: number
    konvaString: string
    content?: IAnnotationContent
    type: AnnotationType
    readonly: boolean
    pdfjsAnnotationStorage: IPdfjsAnnotationStorage
    time: number
}

// 批注类型定义
export const annotationDefinitions: IAnnotationType[] = [
    {
        name: '选择',
        type: AnnotationType.SELECT,
        pdfjsType: PdfjsAnnotationEditorType.NONE,
        isOnce: false,
        readonly: true,
        icon: <SelectIcon />
    },
    {
        name: '高亮',
        type: AnnotationType.HIGHLIGHT,
        pdfjsType: PdfjsAnnotationEditorType.HIGHLIGHT,
        isOnce: false,
        readonly: true,
        icon: <HighlightIcon />,
        style: {
            color: DefaultSettings.HIGHLIGHT_COLOR,
            opacity: 0.5
        }
    },
    {
        name: '删除线',
        type: AnnotationType.STRIKEOUT,
        pdfjsType: PdfjsAnnotationEditorType.HIGHLIGHT,
        isOnce: false,
        readonly: true,
        icon: <StrikeoutIcon />,
        style: {
            color: DefaultSettings.STRIKEOUT_COLOR,
            opacity: DefaultSettings.OPACITY
        }
    },
    {
        name: '下划线',
        type: AnnotationType.UNDERLINE,
        pdfjsType: PdfjsAnnotationEditorType.HIGHLIGHT,
        isOnce: false,
        readonly: true,
        icon: <UnderlineIcon />,
        style: {
            color: DefaultSettings.UNDERLINE_COLOR,
            opacity: DefaultSettings.OPACITY
        }
    },
    {
        name: '文字',
        type: AnnotationType.FREETEXT,
        pdfjsType: PdfjsAnnotationEditorType.STAMP,
        isOnce: true,
        readonly: false,
        icon: <FreetextIcon />,
        style: {
            color: DefaultSettings.COLOR,
            fontSize: DefaultSettings.FONT_SIZE,
            opacity: DefaultSettings.OPACITY
        }
    },
    {
        name: '矩形',
        type: AnnotationType.RECTANGLE,
        pdfjsType: PdfjsAnnotationEditorType.INK,
        isOnce: false,
        readonly: false,
        icon: <RectangleIcon />,
        style: {
            color: DefaultSettings.COLOR,
            strokeWidth: DefaultSettings.STROKE_WIDTH,
            opacity: DefaultSettings.OPACITY
        }
    },
    {
        name: '圆形',
        type: AnnotationType.ELLIPSE,
        pdfjsType: PdfjsAnnotationEditorType.INK,
        isOnce: false,
        readonly: false,
        icon: <EllipseIcon />,
        style: {
            color: DefaultSettings.COLOR,
            strokeWidth: DefaultSettings.STROKE_WIDTH,
            opacity: DefaultSettings.OPACITY
        }
    },
    {
        name: '自由绘制',
        type: AnnotationType.FREEHAND,
        pdfjsType: PdfjsAnnotationEditorType.INK,
        isOnce: false,
        readonly: false,
        icon: <FreehandIcon />,
        style: {
            color: DefaultSettings.COLOR,
            strokeWidth: DefaultSettings.STROKE_WIDTH
        }
    },
    {
        name: '自由高亮',
        type: AnnotationType.FREE_HIGHLIGHT,
        pdfjsType: PdfjsAnnotationEditorType.INK,
        isOnce: false,
        readonly: false,
        icon: <FreeHighlightIcon />,
        style: {
            color: DefaultSettings.COLOR,
            strokeWidth: 10,
            opacity: 0.5
        }
    },
    {
        name: '签名',
        type: AnnotationType.SIGNATURE,
        pdfjsType: PdfjsAnnotationEditorType.STAMP,
        isOnce: true,
        readonly: false,
        icon: <SignatureIcon />,
        style: {
            strokeWidth: 3,
            opacity: 1
        }
    },
    {
        name: '盖章',
        type: AnnotationType.STAMP,
        pdfjsType: PdfjsAnnotationEditorType.STAMP,
        isOnce: true,
        readonly: false,
        icon: <StampIcon />
    }
]
