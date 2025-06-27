import { default_stamp } from './default_stamp'
import PingFangChangAnTiFont from './fonts/PingFangChangAnTi-2.ttf'
import qiantubifengshouxietiFont from './fonts/qiantubifengshouxieti.ttf'

const color = ['#ff0000', '#ffbe00', '#ffff00', '#83d33c', '#00b445', '#00b2f4', '#1677ff', '#001f63', '#7828a4', '#ff00ff']

const fontSize = [14, 16, 18, 20, 22, 24]

const defaultOptions = {
    // 默认颜色
    colors: color,
    // 默认字体大小
    fontSize: fontSize,
    defaultFontList: [
        // 常用英文
        { label: 'Arial', value: 'Arial' },
        { label: 'Times New Roman', value: 'Times New Roman' },
        { label: 'Georgia', value: 'Georgia' },
        { label: 'Verdana', value: 'Verdana' },
        { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
        { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
        { label: 'Courier New', value: '"Courier New", Courier, monospace' },
        { label: 'Lucida Console', value: '"Lucida Console", Monaco, monospace' },
        // 常用中文
        { label: '宋体', value: 'SimSun, Songti SC, STSong, 宋体, "Noto Serif SC", serif' },
        { label: '黑体', value: 'Microsoft YaHei, PingFang SC, Heiti SC, SimHei, 黑体, sans-serif' },
        { label: '楷体', value: 'KaiTi, KaiTi_GB2312, STFangsong, 楷体, "AR PL UKai CN", serif' }
    ],
    handwritingFontList: [
        // 自定义字体
        {
            label: '平方长安体',
            value: 'PingFangChangAnTi-2',
            external: true,
            url: PingFangChangAnTiFont
        },
        {
            label: '千图笔锋手写体',
            value: 'qiantubifengshouxieti',
            external: true,
            url: qiantubifengshouxietiFont
        }
    ],
    // 签名默认配置
    signature: {
        COLORS: ['#000000', '#ff0000', '#1677ff'],
        WIDTH: 366,
        HEIGHT: 200,
        TYPE: 'Draw', // Draw 绘制， Enter 输入， Upload 上传默认签名模式
        MAX_SIZE: 1024 * 1024 * 5, // 最大文件大小为 5MB
        ACCEPT: '.png,.jpg,.jpeg,.bmp' // 签名文件上传类型
    },
    // 盖章默认配置
    stamp: {
        MAX_SIZE: 1024 * 1024 * 5, // 最大文件大小为 5MB
        ACCEPT: '.png,.jpg,.jpeg,.bmp', // 签名文件上传类型
        DEFAULT_STAMP: default_stamp,
        editor: {
            // 编辑器默认配置
            DEFAULT_BACKGROUND_COLOR: '#00b445', // 默认背景颜色
            DEFAULT_BORDER_COLOR: null, // 默认边框颜色
            DEFAULT_TEXT_COLOR: '#fff' // 默认文字颜色
        }
    },
    // 选择器默认配置
    chooseSetting: {
        COLOR: '#1677ff', // 选择工具的颜色
        STROKEWIDTH: 2, // 选择工具的线条宽度
        OPACITY: 0.7, // 连线透明度
    },
    // 连线配置
    connectorLine : {
            ENABLED: true, // 是否启用连线功能
            COLOR: '#1677ff', // 连线颜色
            WIDTH: 2, // 连线宽度
            OPACITY: 0.7, // 连线透明度
    },
    setting: {
        COLOR: color[0], // 默认颜色
        FONT_SIZE: fontSize[2], // 默认字体大小
        HIGHLIGHT_COLOR: color[2], // 默认高亮颜色
        STRIKEOUT_COLOR: color[0], // 默认删除线颜色
        UNDERLINE_COLOR: color[6], // 默认下划线颜色
        STROKE_WIDTH: 2, // 默认线条宽度
        OPACITY: 1, // 默认不透明度
        MAX_CURSOR_SIZE: 96, // 鼠标指针图片最大宽度/高度
        MAX_UPLOAD_IMAGE_SIZE: 800, // 上传图片最大宽度/高度, 大于这个会被等比压缩
        SAVE_BUTTON: true, // 保存按钮
        EXPORT_PDF: true, // 导出pdf
        EXPORT_EXCEL: true, // 导出excel
        LOAD_PDF_ANNOTATION: true, // 是否加载 pdf 原有批注
        DB_CLICK_DELETE: false, // 双击删除批注
        HIDE_PDFJS_ELEMENT: [
            // 需要隐藏的 pdfjs 按钮
            '#editorModeButtons',
            '#editorModeSeparator',
            '#pageRotateCw',
            '#pageRotateCcw',
            '#download'
        ]
    }
}

export { defaultOptions }
