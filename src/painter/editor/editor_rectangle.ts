import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

/**
 * EditorRectangle 是继承自 Editor 的矩形编辑器类。
 */
export class EditorRectangle extends Editor {
    private rect: Konva.Rect // 当前正在绘制的矩形对象
    private vertex: { x: number; y: number } // 矩形的起始顶点坐标

    /**
     * 创建一个 EditorRectangle 实例。
     * @param EditorOptions 初始化编辑器的选项
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.RECTANGLE }) // 调用父类的构造函数
        this.rect = null
        this.vertex = { x: 0, y: 0 }
    }

    /**
     * 处理鼠标按下事件的方法，创建新的矩形对象并添加到舞台。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.rect = null
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup() // 创建新的形状组
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup) // 将形状组添加到背景图层
        const pos = this.konvaStage.getRelativePointerPosition()
        this.vertex = { x: pos.x, y: pos.y } // 记录鼠标按下时的坐标作为矩形的起始点
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            // do not scale strokes
            strokeScaleEnabled: false,
            visible: false,
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth || 2,
            opacity: this.currentAnnotation.style.opacity
        })
        this.currentShapeGroup.konvaGroup.add(this.rect) // 将矩形添加到形状组
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标抬起事件监听器
    }

    /**
     * 处理鼠标移动事件的方法，实时更新绘制的矩形对象的大小和位置。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault()
        this.rect.show() // 显示矩形
        const pos = this.konvaStage.getRelativePointerPosition()
        const areaAttr = {
            x: Math.min(this.vertex.x, pos.x),
            y: Math.min(this.vertex.y, pos.y),
            width: Math.abs(pos.x - this.vertex.x),
            height: Math.abs(pos.y - this.vertex.y)
        }
        this.rect.setAttrs(areaAttr) // 更新矩形的属性（位置和大小）
    }

    /**
     * 处理鼠标抬起事件的方法，完成矩形的绘制并更新到 PDF.js 注解存储。
     */
    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }
        this.isPainting = false
        const group = this.rect.getParent() // 获取矩形所在的组
        if (!this.rect.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id()) // 如果矩形不可见且在组中，则删除该组
            return
        }
        if (this.isTooSmall()) {
            this.rect.destroy() // 如果矩形太小，则销毁矩形对象
            this.delShapeGroup(group.id()) // 删除矩形所在的组
            this.rect = null
            return
        }
        this.setShapeGroupDone({
            id: group.id(),
            color: this.currentAnnotation.style.color,
            contentsObj: {
                text: ''
            }
        }) // 更新 PDF.js 注解存储
        this.rect = null
    }

    /**
     * 全局鼠标抬起事件处理器，仅处理左键释放事件。
     * @param e MouseEvent 对象
     */
    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // 只处理左键释放事件
        this.mouseUpHandler() // 调用鼠标抬起处理方法
        window.removeEventListener('mouseup', this.globalPointerUpHandler) // 移除全局鼠标抬起事件监听器
    }

    /**
     * 判断矩形是否太小（小于最小允许大小）。
     * @returns 如果矩形太小返回 true，否则返回 false
     */
    private isTooSmall(): boolean {
        const { width, height } = this.rect.size() // 获取矩形的宽度和高度
        return Math.max(width, height) < Editor.MinSize // 判断宽度和高度的最大值是否小于最小允许大小
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
                if (shape instanceof Konva.Rect) {
                    if (styles.color !== undefined) {
                        shape.stroke(styles.color)
                    }
                    if (styles.strokeWidth !== undefined) {
                        shape.strokeWidth(styles.strokeWidth)
                    }
                    if (styles.opacity !== undefined) {
                        shape.opacity(styles.opacity)
                    }
                }
            })

            const changedPayload: { konvaString: string; color?: string } = {
                konvaString: group.toJSON()
            }

            if (styles.color !== undefined) {
                changedPayload.color = styles.color
            }

            this.setChanged(id, changedPayload)
        }
    }
}
