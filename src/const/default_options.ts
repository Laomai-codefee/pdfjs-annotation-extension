
const color = ['#ff0000', '#ffbe00', '#ffff00', '#83d33c', '#00b445', '#00b2f4', '#0071c4', '#001f63', '#7828a4']

const fontSize = [14, 16, 18, 20, 22, 24]

const defaultOptions = {
    // 默认颜色
    colors: color,
    // 默认字体大小
    fontSize: fontSize,
    // 签名默认配置
    signature : {
        COLORS: ['#000000', '#ff0000'],
        WIDTH: 366,
        HEIGHT: 200
    },
    // 盖章默认配置
    stamp : {
        MAX_SIZE: 1024 * 1024 * 5 // 最大文件大小为 5MB
    },
    // 选择器默认配置
    chooseSetting : {
        COLOR: '#000', // 选择工具的颜色
        STROKEWIDTH: 1 // 选择工具的线条宽度
    },
    setting : {
        COLOR: color[0], // 默认颜色
        FONT_SIZE: fontSize[2], // 默认字体大小
        HIGHLIGHT_COLOR: color[2], // 默认高亮颜色
        STRIKEOUT_COLOR: color[0], // 默认删除线颜色
        UNDERLINE_COLOR: color[6], // 默认下划线颜色
        STROKE_WIDTH: 2, // 默认线条宽度
        OPACITY: 1, // 默认不透明度
        MAX_CURSOR_SIZE: 96, // 鼠标指针图片最大宽度/高度
        SAVE_BUTTON: true, // 保存按钮
        LOAD_PDF_ANNOTATION: false, // 是否加载 pdf 原有批注 
        HIDE_PDFJS_ELEMENT: [ // 需要隐藏的 pdfjs 按钮
            '#editorModeButtons',
            '#editorModeSeparator',
            '#pageRotateCw',
            '#pageRotateCcw',
            '#download'
        ]
    }
}

export { defaultOptions }
