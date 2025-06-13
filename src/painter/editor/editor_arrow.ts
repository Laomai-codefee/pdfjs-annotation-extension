import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

/**
 * 箭头编辑器类，继承自基础编辑器类 Editor，用于在画布上绘制箭头直线。
 */
export class EditorArrow extends Editor {
    private arrow: Konva.Arrow | null // 当前正在绘制的箭头对象
    private startPoint: { x: number; y: number } // 起点坐标

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.ARROW })
        this.arrow = null
        this.startPoint = { x: 0, y: 0 }
    }

    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) return

        this.arrow = null
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const pos = this.konvaStage.getRelativePointerPosition()
        this.startPoint = { x: pos.x, y: pos.y }

        this.arrow = new Konva.Arrow({
            points: [pos.x, pos.y, pos.x, pos.y],
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth,
            fill: this.currentAnnotation.style.color,
            pointerLength: 10,
            pointerWidth: 10,
            hitStrokeWidth: 20, // 设置点击检测的宽度
            lineCap: 'round',
            lineJoin: 'round',
            strokeScaleEnabled: false,
            visible: false,
            opacity: this.currentAnnotation.style.opacity
        })

        this.currentShapeGroup.konvaGroup.add(this.arrow)
        window.addEventListener('mouseup', this.globalPointerUpHandler)
    }

    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) return
        e.evt.preventDefault()

        const pos = this.konvaStage.getRelativePointerPosition()
        const points = [this.startPoint.x, this.startPoint.y, pos.x, pos.y]

        this.arrow?.show()
        this.arrow?.setAttrs({ points })
    }

    protected mouseUpHandler() {
        if (!this.isPainting) return
        this.isPainting = false

        const group = this.arrow?.getParent()
        if (!this.arrow?.isVisible() && group?.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }

        if (this.isTooShort()) {
            this.arrow?.destroy()
            this.delShapeGroup(group.id())
            this.arrow = null
            return
        }

        this.setShapeGroupDone({
            id: group.id(),
            color: this.currentAnnotation.style.color,
            contentsObj: {
                text: ''
            }
        })

        this.arrow = null
    }

    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return
        this.mouseUpHandler()
        window.removeEventListener('mouseup', this.globalPointerUpHandler)
    }

    private isTooShort(): boolean {
        if (!this.arrow) return true
        const points = this.arrow.points()
        if (points.length !== 4) return true
        const dx = points[2] - points[0]
        const dy = points[3] - points[1]
        return Math.hypot(dx, dy) < Editor.MinSize
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
                if (shape instanceof Konva.Arrow) {
                    shape.stroke(styles.color)
                    shape.fill(styles.color)
                }
            })
            this.setChanged(id, {
                konvaString: group.toJSON(),
                color: styles.color
            })
        }
    }
}
