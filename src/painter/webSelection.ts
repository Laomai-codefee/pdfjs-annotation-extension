import Highlighter from 'web-highlighter'

/**
 * WebSelection 类用于处理网页选区的实用工具类。
 */
export class WebSelection {
    isEditing: boolean // 指示是否启用编辑模式
    onSelect: (pageNumber: number, elements: Array<HTMLElement>) => void // 当选区被选中时调用的回调函数
    highlighterObj: null | Highlighter

    /**
     * 构造一个新的 WebSelection 实例。
     * @param onSelect 当选区被选中时调用的回调函数
     */
    constructor({ onSelect }) {
        this.isEditing = false
        this.onSelect = onSelect
        this.highlighterObj = null
    }

    /**
     * 在指定的根元素和页码上创建一个高亮器。
     * @param root 要应用高亮器的根元素
     */
    public create(root: HTMLDivElement) {
        if(this.highlighterObj) return
        this.highlighterObj = new Highlighter({
            $root: root,
            wrapTag: 'mark'
        })
        this.highlighterObj.on('selection:create', data => {
            const allSourcesId = data.sources.map(item => item.id)
            const allSourcesSpan = []
            allSourcesId.forEach(value => {
                allSourcesSpan.push(...this.highlighterObj.getDoms(value))
            })

            const pageSelection = Object.groupBy(allSourcesSpan, span => {
                return span.closest('.page').getAttribute('data-page-number')
            })

            for (let pageNumber in pageSelection) {
                this.onSelect(parseInt(pageNumber), pageSelection[pageNumber])
            }

            this.highlighterObj.removeAll();
        })
    }

    /**
     * 启用编辑模式。
     */
    enable() {
        this.isEditing = true
        this.highlighterObj?.run()
    }

    /**
     * 禁用编辑模式。
     */
    disable() {
        this.isEditing = false
        this.highlighterObj?.stop()
    }
}
