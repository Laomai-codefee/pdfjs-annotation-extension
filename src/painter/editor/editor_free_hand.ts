import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

/**
 * 自由手绘编辑器类，继承自基础编辑器类 Editor，用于在画布上绘制自由曲线。
 */
export class EditorFreeHand extends Editor {
    private line: Konva.Line | null // 当前正在绘制的自由曲线

    /**
     * 构造函数，初始化自由手绘编辑器。
     * @param EditorOptions 编辑器选项接口
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.FREEHAND })
        this.line = null // 初始化当前曲线为null
    }

    /**
     * 处理鼠标或触摸指针按下事件，开始绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }

        Editor.TimerClear(this.pageNumber) // 清除当前页的计时器
        this.line = null // 重置当前曲线对象
        this.isPainting = true // 设置绘制状态为真

        if (!this.currentShapeGroup) {
            // 如果当前形状组不存在，则创建新的形状组并添加到背景层
            this.currentShapeGroup = this.createShapeGroup()
            this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        }

        // 获取当前指针位置，并初始化线条对象
        const pos = this.konvaStage.getRelativePointerPosition()
        this.line = new Konva.Line({
            // do not scale strokes
            strokeScaleEnabled: false,
            stroke: this.currentAnnotation.style.color, // 设置线条颜色
            strokeWidth: this.currentAnnotation.style.strokeWidth, // 设置线条宽度
            opacity: this.currentAnnotation.style.opacity, // 设置线条透明度
            lineCap: 'round', // 设置线条端点为圆形
            lineJoin: 'round', // 设置线条连接处为圆形
            hitStrokeWidth: 20, // 设置点击检测的宽度
            visible: false, // 初始化为不可见
            globalCompositeOperation: 'source-over',
            points: [pos.x, pos.y, pos.x, pos.y] // 初始化起始点
        })

        this.currentShapeGroup.konvaGroup.add(this.line) // 将曲线添加到当前形状组中
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标释放事件监听器
    }

    /**
     * 处理鼠标或触摸指针移动事件，绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) {
            return
        }

        e.evt.preventDefault() // 阻止默认事件，如滚动页面
        this.line.show() // 显示当前绘制的曲线

        // 获取当前指针位置并更新线条点集
        const pos = this.konvaStage.getRelativePointerPosition()
        const newPoints = this.line.points().concat([pos.x, pos.y])
        this.line.points(newPoints)
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成自由曲线的绘制。
     */
    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }

        this.isPainting = false // 结束绘制状态
        const group = this.line.getParent() // 获取曲线所在的父组

        if (this.isTooSmall()) {
            // 如果曲线太小，则销毁曲线对象并延时保存形状组状态
            this.line.destroy()
            Editor.TimerStart(this.pageNumber, () => {
                this.setShapeGroupDone({
                    id: group.id(),
                    color: this.currentAnnotation.style.color,
                    contentsObj: {
                        text: ''
                    }
                })
                this.currentShapeGroup = null
            })
            return
        }

        // 否则，延时保存形状组状态
        Editor.TimerStart(this.pageNumber, () => {
            this.setShapeGroupDone({
                id: group.id(),
                color: this.currentAnnotation.style.color,
                contentsObj: {
                    text: ''
                }
            })
            this.currentShapeGroup = null
        })

        this.line = null // 重置当前曲线对象为null
    }

    /**
     * 全局鼠标释放事件处理器，仅处理左键释放事件。
     * @param e MouseEvent 对象
     */
    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // 只处理左键释放事件
        this.mouseUpHandler() // 调用指针释放处理方法
        window.removeEventListener('mouseup', this.globalPointerUpHandler) // 移除全局鼠标释放事件监听器
    }

    /**
     * 判断当前绘制的曲线是否太小。
     * @returns 如果曲线点集长度小于 5 返回 true，否则返回 false
     */
    private isTooSmall(): boolean {
        return this.line.points().length < Editor.MinSize
    }

    /**
     * @description 更改注释样式
     * @param annotationStore
     * @param styles
     */
    protected changeStyle(annotationStore: IAnnotationStore, styles: IAnnotationStyle): void {
        const id = annotationStore.id
        const group = this.getShapeGroupById(id)
        if (group) {
            group.getChildren().forEach(shape => {
                if (shape instanceof Konva.Line) {
                    shape.stroke(styles.color)
                }
            })
            this.setChanged(id, {
                konvaString: group.toJSON(),
                color: styles.color
            })
        }
    }
}
