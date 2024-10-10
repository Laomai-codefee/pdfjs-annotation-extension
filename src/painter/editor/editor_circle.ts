import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'
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

        // 提取椭圆的属性并保存形状组的状态
        const { x, y, radiusX, radiusY } = this.ellipse.attrs
        this.setShapeGroupDone({
            id: group.id(),
            color: this.currentAnnotation.style.color,
            contentsObj: {
                text: ''
            }
        }
            
            // this.calculateEllipseForStorage({
            //     x,
            //     y,
            //     radiusX,
            //     radiusY,
            //     annotationType: this.currentAnnotation.pdfjsType,
            //     color: getRGB(this.currentAnnotation.style.color),
            //     thickness: this.currentAnnotation.style.strokeWidth || 2,
            //     opacity: this.currentAnnotation.style.opacity,
            //     pageIndex: this.pageNumber - 1
            // })
        )
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
     * 刷新 Pdfjs 注释存储，用于更新或修正注释组。
     * @param groupId 注释组 ID
     * @param groupString 注释组的序列化字符串
     * @param rawAnnotationStore 原始注释存储数据
     * @returns 更新后的 Pdfjs 注释存储对象
     */
    public async refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore) {
        return null
        // const ghostGroup = Konva.Node.create(groupString) // 通过序列化字符串创建临时组
        // const ellipse = this.getGroupNodesByClassName(ghostGroup, 'Ellipse')[0] as Konva.Ellipse // 获取椭圆对象
        // const { x, y, radiusX, radiusY } = this.fixShapeCoordinateForGroup(ellipse, ghostGroup) // 修正椭圆坐标
        // return {
        //     annotationStorage: this.calculateEllipseForStorage({
        //         x,
        //         y,
        //         radiusX,
        //         radiusY,
        //         annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
        //         color: rawAnnotationStore.pdfjsAnnotationStorage.color,
        //         thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
        //         opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
        //         pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
        //     })
        // }
    }

    /**
     * 修正椭圆在组内的坐标。
     * @param shape Konva.Ellipse 对象
     * @param group Konva.Group 对象
     * @returns 修正后的坐标和半径
     */
    private fixShapeCoordinateForGroup(shape: Konva.Ellipse, group: Konva.Group) {
        const groupTransform = group.getTransform() // 获取组的全局变换矩阵
        const localX = shape.attrs.x // 获取椭圆的局部 x 坐标
        const localY = shape.attrs.y // 获取椭圆的局部 y 坐标

        // 将椭圆的局部坐标转换为全局坐标
        const globalPos = groupTransform.point({ x: localX, y: localY })

        // 计算椭圆的全局半径
        const globalRadiusX = shape.attrs.radiusX * (group.attrs.scaleX || 1)
        const globalRadiusY = shape.attrs.radiusY * (group.attrs.scaleY || 1)

        return {
            x: globalPos.x,
            y: globalPos.y,
            radiusX: globalRadiusX,
            radiusY: globalRadiusY
        }
    }

    /**
     * 将椭圆数据转换为 PDF.js 所需的注释存储数据格式。
     * @param param0 参数对象
     * @returns 符合 PDF.js 注释存储数据格式的对象
     */
    private calculateEllipseForStorage({
        x,
        y,
        radiusX,
        radiusY,
        annotationType,
        color,
        thickness,
        opacity,
        pageIndex
    }: {
        x: number
        y: number
        radiusX: number
        radiusY: number
        annotationType: PdfjsAnnotationEditorType
        color: number[]
        thickness: number
        opacity: number
        pageIndex: number
    }): IPdfjsAnnotationStorage {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y
        const halfInterval: number = 0.5 // 角度间隔
        const points: number[] = []

        // 计算椭圆周上的点，并将其转换为适合 PDF.js 存储的格式
        for (let angle = 0; angle <= 360; angle += halfInterval) {
            const radians = (angle * Math.PI) / 180
            const pointX = x + radiusX * Math.cos(radians)
            const pointY = y + radiusY * Math.sin(radians)
            points.push(pointX, canvasHeight - pointY) // 将点添加到数组中，并调整 y 坐标
        }

        // 计算椭圆的边界矩形的左上角和右下角顶点坐标
        const rect: [number, number, number, number] = [x - radiusX * 2, canvasHeight - (y + radiusY * 2), x + radiusX * 2, canvasHeight - (y - radiusY * 2)]

        return {
            annotationType,
            color,
            thickness,
            opacity,
            paths: [{ bezier: points, points: points }], // 存储椭圆路径
            pageIndex,
            rect: rect,
            rotation: 0
        }
    }

    /**
     * 判断椭圆是否太小。
     * @returns 如果椭圆的宽度或高度小于最小尺寸，返回 true，否则返回 false。
     */
    private isTooSmall(): boolean {
        const { width, height } = this.ellipse.size()
        return Math.max(width, height) < Editor.MinSize
    }
}
