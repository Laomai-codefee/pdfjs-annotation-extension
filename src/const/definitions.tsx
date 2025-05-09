import {
    CircleIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    RectangleIcon,
    SelectIcon,
    SignatureIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon,
    NoteIcon
} from './icon'
import { IRect } from 'konva/lib/types'
import { defaultOptions } from './default_options'

export type PdfjsAnnotationSubtype =
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
    | 'Note'

// PDF.js 批注类型
export enum PdfjsAnnotationType {
    NONE = 0,
    TEXT = 1,
    LINK = 2,
    FREETEXT = 3,
    LINE = 4,
    SQUARE = 5,
    CIRCLE = 6,
    POLYGON = 7,
    POLYLINE = 8,
    HIGHLIGHT = 9,
    UNDERLINE = 10,
    SQUIGGLY = 11,
    STRIKEOUT = 12,
    STAMP = 13,
    CARET = 14,
    INK = 15,
    POPUP = 16,
    FILEATTACHMENT = 17,
    SOUND = 18,
    MOVIE = 19,
    WIDGET = 20,
    SCREEN = 21,
    PRINTERMARK = 22,
    TRAPNET = 23,
    WATERMARK = 24,
    THREED = 25,
    REDACT = 26,
    NOTE = 27
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
    CIRCLE = 6, // 圆形批注
    FREEHAND = 7, // 自由绘制批注
    FREE_HIGHLIGHT = 8, // 自由高亮批注
    SIGNATURE = 9, // 签名批注
    STAMP = 10, // 盖章批注
    NOTE = 11
}

// 定义批注类型的接口
// 用于描述应用中支持的批注类型
export interface IAnnotationType {
    name: string // 批注的名称
    type: AnnotationType // 自定义的批注类型
    pdfjsEditorType: PdfjsAnnotationEditorType // 对应的 Pdfjs 批注类型
    pdfjsAnnotationType: PdfjsAnnotationType
    subtype?: PdfjsAnnotationSubtype
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
export interface IAnnotationComment {
    id: string;
    title: string; // 批注标题
    date: string; // 批注日期
    content: string; // 批注内容
}

export interface IAnnotationContentsObj {
    text: string; // 文本内容
    image?: string; // 可选的图片属性
}

// 批注存储接口
// 用于描述存储在应用中的批注信息
export interface IAnnotationStore {
    id: string; // 批注的唯一标识符
    pageNumber: number; // 批注所在的页码
    konvaString: string; // Konva 的序列化表示
    konvaClientRect: IRect; // 批注在 stage 中的位置
    title: string; // 批注标题
    type: AnnotationType; // 批注类型
    color?: string | null; // 可选颜色，可以是 undefined 或 null
    subtype: PdfjsAnnotationSubtype;
    fontSize?: number | null;
    pdfjsType: PdfjsAnnotationType; // PDF.js 批注类型
    pdfjsEditorType: PdfjsAnnotationEditorType; // PDF.js 编辑器类型
    date: string; // 创建或修改日期
    contentsObj?: IAnnotationContentsObj | null; // 可选的内容对象
    comments: IAnnotationComment[]; // 与批注相关的评论数组
    readonly: boolean; // 表示批注是否只读，不可移动
}

// 批注类型定义数组
// 用于描述所有支持的批注类型及其属性
export const annotationDefinitions: IAnnotationType[] = [
    {
        name: 'select', // 批注名称
        type: AnnotationType.SELECT, // 批注类型
        pdfjsEditorType: PdfjsAnnotationEditorType.NONE, // 对应的 PDF.js 批注类型
        pdfjsAnnotationType: PdfjsAnnotationType.NONE,
        isOnce: false, // 是否只绘制一次
        readonly: true, // 是否只读
        icon: <SelectIcon /> // 图标
    },
    {
        name: 'highlight',
        type: AnnotationType.HIGHLIGHT,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotationType.HIGHLIGHT,
        subtype: 'Highlight',
        isOnce: false,
        readonly: true,
        icon: <HighlightIcon />,
        style: {
            color: defaultOptions.setting.HIGHLIGHT_COLOR, // 默认高亮颜色
            opacity: 0.5 // 默认透明度
        }
    },
    {
        name: 'strikeout',
        type: AnnotationType.STRIKEOUT,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotationType.STRIKEOUT,
        subtype: 'StrikeOut',
        isOnce: false,
        readonly: true,
        icon: <StrikeoutIcon />,
        style: {
            color: defaultOptions.setting.STRIKEOUT_COLOR, // 默认删除线颜色
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'underline',
        type: AnnotationType.UNDERLINE,
        pdfjsEditorType: PdfjsAnnotationEditorType.HIGHLIGHT,
        pdfjsAnnotationType: PdfjsAnnotationType.UNDERLINE,
        subtype: 'Underline',
        isOnce: false,
        readonly: true,
        icon: <UnderlineIcon />,
        style: {
            color: defaultOptions.setting.UNDERLINE_COLOR, // 默认下划线颜色
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'rectangle',
        type: AnnotationType.RECTANGLE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotationType.SQUARE,
        subtype: 'Square',
        isOnce: true,
        readonly: false,
        icon: <RectangleIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认矩形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'circle',
        type: AnnotationType.CIRCLE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotationType.CIRCLE,
        subtype: 'Circle',
        isOnce: true,
        readonly: false,
        icon: <CircleIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认圆形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'note',
        type: AnnotationType.NOTE,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotationType.NOTE,
        subtype: 'Note',
        isOnce: true,
        readonly: false,
        icon: <NoteIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认多边形颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'freehand',
        type: AnnotationType.FREEHAND,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotationType.INK,
        subtype: 'Ink',
        isOnce: false,
        readonly: false,
        icon: <FreehandIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认自由绘制颜色
            strokeWidth: defaultOptions.setting.STROKE_WIDTH, // 默认线条宽度
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'freeHighlight',
        type: AnnotationType.FREE_HIGHLIGHT,
        pdfjsEditorType: PdfjsAnnotationEditorType.INK,
        pdfjsAnnotationType: PdfjsAnnotationType.POLYLINE,
        subtype: 'PolyLine',
        isOnce: false,
        readonly: false,
        icon: <FreeHighlightIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认自由高亮颜色
            strokeWidth: 10, // 默认线条宽度
            opacity: 0.5 // 默认透明度
        }
    },
    {
        name: 'freeText',
        type: AnnotationType.FREETEXT,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotationType.FREETEXT,
        subtype: 'FreeText',
        isOnce: true,
        readonly: false,
        icon: <FreetextIcon />,
        style: {
            color: defaultOptions.setting.COLOR, // 默认文字颜色
            fontSize: defaultOptions.setting.FONT_SIZE, // 默认字体大小
            opacity: defaultOptions.setting.OPACITY // 默认透明度
        }
    },
    {
        name: 'signature',
        type: AnnotationType.SIGNATURE,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotationType.CARET,
        subtype: 'Caret',
        isOnce: true,
        readonly: false,
        icon: <SignatureIcon />,
        style: {
            strokeWidth: 3, // 默认线条宽度
            opacity: 1 // 默认不透明度
        }
    },
    {
        name: 'stamp',
        type: AnnotationType.STAMP,
        pdfjsEditorType: PdfjsAnnotationEditorType.STAMP,
        pdfjsAnnotationType: PdfjsAnnotationType.STAMP,
        subtype: 'Stamp',
        isOnce: true,
        readonly: false,
        icon: <StampIcon />
    }
]

export const HASH_PARAMS_PREFIX = 'ae'

export const HASH_PARAMS_USERNAME = `${HASH_PARAMS_PREFIX}_username`

export const HASH_PARAMS_GET_URL = `${HASH_PARAMS_PREFIX}_get_url`

export const HASH_PARAMS_POST_URL = `${HASH_PARAMS_PREFIX}_post_url`

