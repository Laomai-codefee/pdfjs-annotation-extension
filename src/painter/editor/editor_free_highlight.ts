import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

export class EditorFreeHighlight extends Editor {
    private line: Konva.Line | null // 当前正在绘制的自由曲线

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.FREE_HIGHLIGHT })
        this.line = null // 初始化当前曲线为 null
    }

    /**
     * 处理鼠标或触摸指针按下事件，开始绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {
        if (e.currentTarget !== this.konvaStage) {
            return
        }

        this.line = null // 重置当前曲线对象
        this.isPainting = true

        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const pos = this.konvaStage.getRelativePointerPosition()

        this.line = new Konva.Line({
            // do not scale strokes
            strokeScaleEnabled: false,
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth,
            opacity: this.currentAnnotation.style.opacity,
            hitStrokeWidth: this.currentAnnotation.style.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            visible: false,
            globalCompositeOperation: 'source-over',
            points: [pos.x, pos.y] // 初始化起始点
        })

        this.currentShapeGroup.konvaGroup.add(this.line) // 将曲线添加到当前形状组中
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标释放事件监听器
    }

    /**
     * 处理鼠标或触摸指针移动事件，绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault() // 阻止默认事件，如滚动页面
        this.line.show() // 显示当前绘制的曲线
        const pos = this.konvaStage.getRelativePointerPosition()
        const newPoints = this.line.points().concat([pos.x, pos.y])
        this.line.points(newPoints) // 更新曲线的点集
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成自由曲线的绘制。
     */
    protected mouseUpHandler(): void {
        if (!this.isPainting) {
            return
        }

        this.isPainting = false // 结束绘制状态

        // 获取曲线的父节点组
        const group = this.line?.getParent()
        if (group && !this.line.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }

        if (this.isTooSmall()) {
            this.line?.destroy()
            if (group) {
                this.delShapeGroup(group.id())
            }
            this.line = null
            return
        }

        if (this.line) {
            const originalPoints = this.line.points()
            const correctedPoints = this.correctLineIfStraight(originalPoints)
            this.line.points(correctedPoints) // 更新线条点集为修正后的点集
            this.setShapeGroupDone(
                {
                    id: group.id(),
                    color: this.currentAnnotation.style.color,
                    contentsObj: {
                        text: ''
                    }
                }
            )
            this.line = null
        }
    }

    /**
     * 全局鼠标释放事件处理器，仅处理左键释放事件。
     * @param e MouseEvent 对象
     */
    private globalPointerUpHandler = (e: MouseEvent): void => {
        if (e.button !== 0) return // 只处理左键释放事件
        this.mouseUpHandler() // 调用指针释放处理方法
        window.removeEventListener('mouseup', this.globalPointerUpHandler) // 移除全局鼠标释放事件监听器
    }

    /**
     * 修正接近水平或垂直的线条，使其成为完全水平或垂直的直线。
     * @param points 曲线的点集
     * @returns 修正后的点集
     */
    private correctLineIfStraight(points: number[]): number[] {
        // 阈值，用于判断线段接近水平或垂直
        const THRESHOLD_ANGLE_DEGREES = 2

        // 获取起始和结束点的坐标
        const startX = points[0]
        const startY = points[1]
        const endX = points[points.length - 2]
        const endY = points[points.length - 1]

        const deltaX = endX - startX
        const deltaY = endY - startY

        // 计算线段的角度
        const angleRad = Math.atan2(deltaY, deltaX)
        const angleDeg = Math.abs(angleRad * (180 / Math.PI))

        // 判断线段是否接近水平或垂直
        const isCloseToHorizontal = angleDeg <= THRESHOLD_ANGLE_DEGREES || angleDeg >= 180 - THRESHOLD_ANGLE_DEGREES
        const isCloseToVertical = Math.abs(angleDeg - 90) <= THRESHOLD_ANGLE_DEGREES

        if (isCloseToHorizontal) {
            // 修正为水平线
            return points.map((value, index) => (index % 2 === 0 ? value : startY))
        } else if (isCloseToVertical) {
            // 修正为垂直线
            return points.map((value, index) => (index % 2 === 0 ? startX : value))
        }

        // 返回原始点集
        return points
    }

    /**
     * 判断当前绘制的曲线是否太小。
     * @returns 如果曲线点集长度小于 5 返回 true，否则返回 false
     */
    private isTooSmall(): boolean {
        return (this.line?.points().length || 0) < 5
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
