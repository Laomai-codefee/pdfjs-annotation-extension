import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { IEditorOptions, Editor } from './editor'
import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'

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
    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
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
    protected mouseMoveHandler(e: KonvaEventObject<PointerEvent>) {
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
        const { x, y, width, height } = this.fixShapeCoordinateForGroup(this.rect, this.currentShapeGroup.konvaGroup) // 调整矩形在组中的坐标
        this.setShapeGroupDone(
            group.id(),
            this.calculateRectForStorage({
                x,
                y,
                width,
                height,
                annotationType: this.currentAnnotation.pdfjsType,
                color: getRGB(this.currentAnnotation.style.color),
                thickness: this.currentAnnotation.style.strokeWidth || 2,
                opacity: this.currentAnnotation.style.opacity,
                pageIndex: this.pageNumber - 1
            })
        ) // 更新 PDF.js 注解存储
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
     * 刷新 PDF.js 注解存储，从序列化的组字符串中恢复矩形的信息。
     * @param groupId 形状组的 ID
     * @param groupString 序列化的组字符串
     * @param rawAnnotationStore 原始注解存储对象
     * @returns 返回更新后的 PDF.js 注解存储对象的 Promise
     */
    public async refreshPdfjsAnnotationStorage(
        groupId: string,
        groupString: string,
        rawAnnotationStore: IAnnotationStore
    ): Promise<{ annotationStorage: IPdfjsAnnotationStorage; batchPdfjsAnnotationStorage?: IPdfjsAnnotationStorage[] }> {
        const ghostGroup = Konva.Node.create(groupString) // 根据序列化的组字符串创建 Konva 节点
        const rect = this.getGroupNodesByClassName(ghostGroup, 'Rect')[0] as Konva.Rect // 获取组中的矩形对象
        const { x, y, width, height } = this.fixShapeCoordinateForGroup(rect, ghostGroup) // 调整矩形在组中的坐标
        return {
            annotationStorage: this.calculateRectForStorage({
                x,
                y,
                width,
                height,
                annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
                color: rawAnnotationStore.pdfjsAnnotationStorage.color,
                thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
                opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
                pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
            }) // 计算并返回更新后的 PDF.js 注解存储对象
        }
    }

    /**
     * 调整矩形在组中的坐标和大小。
     * @param shape Konva.Rect 对象（矩形）
     * @param group Konva.Group 对象（组）
     * @returns 返回调整后的坐标信息
     */
    private fixShapeCoordinateForGroup(shape: Konva.Rect, group: Konva.Group) {
        const shapeLocalRect = shape.getClientRect({ relativeTo: group }) // 获取矩形在组中的局部坐标

        const groupTransform = group.getTransform() // 获取组的全局变换

        const shapeGlobalPos = groupTransform.point({
            x: shapeLocalRect.x,
            y: shapeLocalRect.y
        }) // 使用组的变换将局部坐标转换为全局坐标

        const globalWidth = shapeLocalRect.width * (group.attrs.scaleX || 1) // 计算形状的全局宽度
        const globalHeight = shapeLocalRect.height * (group.attrs.scaleY || 1) // 计算形状的全局高度

        return {
            x: shapeGlobalPos.x,
            y: shapeGlobalPos.y,
            width: globalWidth,
            height: globalHeight
        }
    }

    /**
     * 将矩形数据转换为 PDF.js 注解存储所需的数据格式。
     * @param param0 包含矩形和相关信息的参数
     * @returns 返回处理后的 PDF.js 注解存储对象
     */
    private calculateRectForStorage({
        x,
        y,
        width,
        height,
        annotationType,
        color,
        thickness,
        opacity,
        pageIndex
    }: {
        x: number
        y: number
        width: number
        height: number
        annotationType: PdfjsAnnotationEditorType
        color: any
        thickness: number
        opacity: number
        pageIndex: number
    }): IPdfjsAnnotationStorage {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y // 获取舞台的缩放后的高度
        const halfInterval: number = 0.5 // 半间隔大小
        const points: number[] = [] // 用于存储顶点坐标的数组

        const rectBottomRightX: number = x + width // 计算矩形的右下角顶点 X 坐标
        const rectBottomRightY: number = y + height // 计算矩形的右下角顶点 Y 坐标
        const rect: [number, number, number, number] = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY] // 组装矩形坐标信息

        // 添加矩形边框上的顶点坐标
        // 左边缘上的点
        for (let i = y; i < rectBottomRightY; i += halfInterval) {
            points.push(x, canvasHeight - i)
        }
        // 底边缘上的点
        for (let i = x + halfInterval; i < rectBottomRightX; i += halfInterval) {
            points.push(i, canvasHeight - rectBottomRightY)
        }
        // 右边缘上的点
        for (let i = rectBottomRightY - halfInterval; i >= y; i -= halfInterval) {
            points.push(rectBottomRightX, canvasHeight - i)
        }
        // 顶边缘上的点
        for (let i = rectBottomRightX - halfInterval; i >= x + halfInterval; i -= halfInterval) {
            points.push(i, canvasHeight - y)
        }

        return {
            annotationType,
            color,
            thickness,
            opacity,
            paths: [{ bezier: points, points: points }], // 存储路径信息
            pageIndex,
            rect: rect, // 存储矩形的坐标信息
            rotation: 0 // 默认旋转角度为 0
        }
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
     * 空方法，处理鼠标移出事件。
     */
    protected mouseOutHandler() {}

    /**
     * 空方法，处理鼠标移入事件。
     */
    protected mouseEnterHandler() {}
}
