import {
    EllipseIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    RectangleIcon,
    SelectIcon,
    SignatureIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon
} from './icon'

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
     * 表示绘制路径上的一些关键坐标点
     */
    points?: number[]
}

/**
 * PDF.js 批注存储接口定义
 * 描述了存储在 PDF.js 中的批注的各种属性
 */
export interface IPdfjsAnnotationStorage {
    /**
     * 批注的类型
     * 对应 PDF.js 内部定义的批注类型枚举
     */
    annotationType: PdfjsAnnotationEditorType

    /**
     * 批注颜色，使用 [R, G, B] 数组表示
     * 表示批注的颜色，范围从 0 到 255
     */
    color?: number[]

    /**
     * 批注的线条粗细
     * 表示批注线条的宽度
     */
    thickness?: number

    /**
     * 批注的不透明度 (0.0 - 1.0)
     * 表示批注的透明度，0.0 为完全透明，1.0 为完全不透明
     */
    opacity?: number

    /**
     * 描述批注的路径数据数组
     * 用于存储批注的路径信息，例如手绘的路径
     */
    paths?: IPathData[]

    /**
     * 批注所在的页面索引（从0开始）
     * 表示批注位于 PDF 的第几页
     */
    pageIndex: number

    /**
     * 批注的边界矩形，以 [x, y, width, height] 表示
     * 可选，因为并非所有批注类型都需要这个属性
     * 用于描述批注在页面上的位置和尺寸
     */
    rect?: [number, number, number, number]

    /**
     * 路径的四边形点数组
     * 用于表示四边形批注的各个顶点
     */
    quadPoints?: number[]

    /**
     * 批注的轮廓点数组
     * 用于描述批注的轮廓形状
     */
    outlines?: number[][]

    /**
     * 批注的旋转角度（度数）
     * 可选，因为并非所有批注类型都需要旋转属性
     */
    rotation?: number

    /**
     * 图片标识
     * 用于存储签名或图章的标识符
     */
    bitmapId?: string

    /**
     * 图片数据
     * 用于存储签名或图章的图像数据
     */
    bitmap?: ImageBitmap

    /**
     * 图片名称
     * 用于存储图章的名称
     */
    bitmapName?: string

    /**
     * 图片 URL
     * 用于存储图章的 URL 地址
     */
    bitmapUrl?: string

    /**
     * 是否为 SVG 图像
     * 用于指示图像是否为 SVG 格式
     */
    isSvg?: boolean

    /**
     * 结构树父节点 ID
     * 用于标识批注在结构树中的父节点
     */
    structTreeParentId?: string
}

// PDF.js 自带的批注编辑器类型枚举
// 用于定义 PDF.js 支持的批注类型
export enum PdfjsAnnotationEditorType {
    DISABLE = -1, // 禁用批注编辑器
    NONE = 0, // 没有批注类型
    FREETEXT = 3, // 自由文本批注
    HIGHLIGHT = 9, // 高亮批注
    STAMP = 13, // 盖章批注
    INK = 15 // 墨迹（自由绘制）批注
}

// 自定义的批注类型枚举
// 用于定义在应用中使用的批注类型
export enum AnnotationType {
    NONE = -1, // 没有批注类型
    SELECT = 0, // 选择批注
    HIGHLIGHT = 1, // 高亮批注
    STRIKEOUT = 2, // 删除线批注
    UNDERLINE = 3, // 下划线批注
    FREETEXT = 4, // 自由文本批注
    RECTANGLE = 5, // 矩形批注
    ELLIPSE = 6, // 圆形批注
    FREEHAND = 7, // 自由绘制批注
    FREE_HIGHLIGHT = 8, // 自由高亮批注
    SIGNATURE = 9, // 签名批注
    STAMP = 10 // 盖章批注
}

// 配置默认颜色
// 提供一组默认的颜色选项
export const DefaultColors = ['#FF0000', '#FFBE00', '#CC0000', '#FFFF00', '#83D33C', '#00B445', '#00B2F4', '#0071C4', '#001F63', '#7828A4']

// 配置默认字体大小
// 提供一组默认的字体大小选项
export const DefaultFontSize = [12, 14, 16, 18, 20, 22, 24]

// 配置默认的签名设置
export const DefaultSignatureSetting = {
    COLORS: ['#000000', '#FF0000'], // 签名的默认颜色选项
    WIDTH: 366, // 签名框的宽度
    HEIGHT: 200 // 签名框的高度
}

export const DefaultStampSetting = {
    MAX_SIZE: 1024 * 1024 * 1024 // 最大文件大小为 10MB
}

// 配置默认的选择设置
// 提供默认的选择工具的颜色和线条宽度
export const DefaultChooseSetting = {
    COLOR: '#0071C4', // 选择工具的颜色
    STROKEWIDTH: 2 // 选择工具的线条宽度
}

// 默认配置对象
// 提供一组默认的批注设置
export const DefaultSettings = {
    COLOR: DefaultColors[0], // 默认颜色
    FONT_SIZE: DefaultFontSize[0], // 默认字体大小
    HIGHLIGHT_COLOR: DefaultColors[1], // 默认高亮颜色
    STRIKEOUT_COLOR: DefaultColors[0], // 默认删除线颜色
    UNDERLINE_COLOR: DefaultColors[6], // 默认下划线颜色
    STROKE_WIDTH: 2, // 默认线条宽度
    OPACITY: 1, // 默认不透明度
    MAX_CURSOR_SIZE: 96 // 鼠标指针图片最大宽度/高度
}

// 定义批注类型的接口
// 用于描述应用中支持的批注类型
export interface IAnnotationType {
    name: string // 批注的名称
    type: AnnotationType // 自定义的批注类型
    pdfjsType: PdfjsAnnotationEditorType // 对应的 Pdfjs 批注类型
    isOnce: boolean // 是否只绘制一次
    readonly: boolean // 绘制的图形是否可以调整修改
    icon?: React.JSX.Element // 可选的图标，用于表示批注类型
    style?: IAnnotationStyle // 可选的样式配置对象
}

// 批注的样式配置接口
// 用于描述批注的外观样式
export interface IAnnotationStyle {
    color?: string // 线条、文本、填充的颜色
    fontSize?: number // 字体大小
    opacity?: number // 透明度
    strokeWidth?: number // 边框宽度
}

// 批注的内容接口
// 用于描述批注的文本或图像内容
export interface IAnnotationContent {
    text?: string // 批注的文本内容
    image?: string // 批注的图像内容
    batchPdfjsAnnotationStorage?: IPdfjsAnnotationStorage[] //批量应用对应的 pdfjs store
}

// 批注存储接口
// 用于描述存储在应用中的批注信息
export interface IAnnotationStore {
    id: string // 批注的唯一标识符
    pageNumber: number // 批注所在的页面编号
    konvaString: string // 批注的 Konva 相关数据（Konva 是一个 HTML5 2D 绘图库）
    content?: IAnnotationContent // 可选的批注内容
    type: AnnotationType // 批注的类型
    readonly: boolean // 批注是否只读
    pdfjsAnnotationStorage: IPdfjsAnnotationStorage // 对应的 PDF.js 批注存储数据
    time: number // 批注的创建时间（时间戳）
}

// 批注类型定义数组
// 用于描述所有支持的批注类型及其属性
export const annotationDefinitions: IAnnotationType[] = [
    {
        name: '选择', // 批注名称
        type: AnnotationType.SELECT, // 批注类型
        pdfjsType: PdfjsAnnotationEditorType.NONE, // 对应的 PDF.js 批注类型
        isOnce: false, // 是否只绘制一次
        readonly: true, // 是否只读
        icon: <SelectIcon /> // 图标
    },
    {
        name: '高亮',
        type: AnnotationType.HIGHLIGHT,
        pdfjsType: PdfjsAnnotationEditorType.HIGHLIGHT,
        isOnce: false,
        readonly: true,
        icon: <HighlightIcon />,
        style: {
            color: DefaultSettings.HIGHLIGHT_COLOR, // 默认高亮颜色
            opacity: 0.5 // 默认透明度
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
            color: DefaultSettings.STRIKEOUT_COLOR, // 默认删除线颜色
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            color: DefaultSettings.UNDERLINE_COLOR, // 默认下划线颜色
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            color: DefaultSettings.COLOR, // 默认矩形颜色
            strokeWidth: DefaultSettings.STROKE_WIDTH, // 默认线条宽度
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            color: DefaultSettings.COLOR, // 默认圆形颜色
            strokeWidth: DefaultSettings.STROKE_WIDTH, // 默认线条宽度
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            color: DefaultSettings.COLOR, // 默认自由绘制颜色
            strokeWidth: DefaultSettings.STROKE_WIDTH, // 默认线条宽度
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            color: DefaultSettings.COLOR, // 默认自由高亮颜色
            strokeWidth: 10, // 默认线条宽度
            opacity: 0.5 // 默认透明度
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
            color: DefaultSettings.COLOR, // 默认文字颜色
            fontSize: DefaultSettings.FONT_SIZE, // 默认字体大小
            opacity: DefaultSettings.OPACITY // 默认透明度
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
            strokeWidth: 3, // 默认线条宽度
            opacity: 1 // 默认不透明度
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
