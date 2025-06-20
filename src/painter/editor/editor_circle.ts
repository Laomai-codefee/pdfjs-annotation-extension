import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

/**
 * 椭圆编辑器类，继承自基础编辑器类 Editor，用于在画布上绘制椭圆。
 */
export class EditorCircle extends Editor {
    private ellipse: Konva.Ellipse | null // 当前正在绘制的椭圆对象
    private vertex: { x: number; y: number } // 用于存储椭圆的起点（顶点）坐标

    /**
     * 构造函数，初始化椭圆编辑器。
     * @param EditorOptions 编辑器选项接口
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.CIRCLE })
        this.ellipse = null
        this.vertex = { x: 0, y: 0 }
    }

    /**
     * 处理鼠标或触摸指针按下事件，开始绘制椭圆。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.ellipse = null // 重置当前椭圆对象
        this.isPainting = true // 设置绘制状态为真
        this.currentShapeGroup = this.createShapeGroup() // 创建新的形状组
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup) // 将形状组添加到背景层

        // 获取当前指针位置并存储为椭圆的起点（顶点）坐标
        const pos = this.konvaStage.getRelativePointerPosition()
        this.vertex = { x: pos.x, y: pos.y }

        // 初始化椭圆对象，初始半径为0
        this.ellipse = new Konva.Ellipse({
            radiusX: 0,
            radiusY: 0,
            x: pos.x,
            y: pos.y,
            // do not scale strokes
            strokeScaleEnabled: false,
            visible: false, // 初始状态为不可见
            stroke: this.currentAnnotation.style.color, // 设置椭圆边框颜色
            strokeWidth: this.currentAnnotation.style.strokeWidth, // 设置椭圆边框宽度
            opacity: this.currentAnnotation.style.opacity // 设置椭圆透明度
        })

        // 将椭圆对象添加到当前形状组中
        this.currentShapeGroup.konvaGroup.add(this.ellipse)
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标释放事件监听器
    }

    /**
     * 处理鼠标或触摸指针移动事件，绘制椭圆。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault() // 阻止默认事件，如滚动页面

        this.ellipse.show() // 显示当前绘制的椭圆

        // 获取当前指针位置并计算椭圆的半径
        const pos = this.konvaStage.getRelativePointerPosition()
        const radiusX = Math.abs(pos.x - this.vertex.x) / 2
        const radiusY = Math.abs(pos.y - this.vertex.y) / 2

        // 计算椭圆的中心点和半径，并更新椭圆属性
        const areaAttr = {
            x: (pos.x - this.vertex.x) / 2 + this.vertex.x,
            y: (pos.y - this.vertex.y) / 2 + this.vertex.y,
            radiusX,
            radiusY
        }

        this.ellipse.setAttrs(areaAttr)
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成椭圆的绘制。
     */
    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }
        this.isPainting = false // 结束绘制状态

        // 如果图形是隐藏状态，将图形从画布和 MAP 上移除
        const group = this.ellipse.getParent()
        if (!this.ellipse.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }

        if (this.isTooSmall()) {
            // 如果椭圆太小，则销毁椭圆对象并移除形状组
            this.ellipse.destroy()
            this.delShapeGroup(group.id())
            this.ellipse = null
            return
        }

        this.setShapeGroupDone({
            id: group.id(),
            color: this.currentAnnotation.style.color,
            contentsObj: {
                text: ''
            }
        })
        this.ellipse = null // 重置当前椭圆对象为 null
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
     * 判断椭圆是否太小。
     * @returns 如果椭圆的宽度或高度小于最小尺寸，返回 true，否则返回 false。
     */
    private isTooSmall(): boolean {
        const { width, height } = this.ellipse.size()
        return Math.max(width, height) < Editor.MinSize
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
                if (shape instanceof Konva.Ellipse) {
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
