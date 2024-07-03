import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { IEditorOptions, Editor } from './editor'
import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'

export class EditorEllipse extends Editor {
    private ellipse: Konva.Ellipse // 当前正在绘制的图形

    private vertex: {
        x: number
        y: number
    }

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.ELLIPSE })
        this.ellipse = null
        this.vertex = {
            x: 0,
            y: 0
        }
    }

    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.ellipse = null
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        const pos = this.konvaStage.getRelativePointerPosition()
        this.vertex = {
            x: pos.x,
            y: pos.y
        }
        this.ellipse = new Konva.Ellipse({
            radiusX: 0,
            radiusY: 0,
            x: pos.x,
            y: pos.y,
            visible: false,
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth,
            opacity: this.currentAnnotation.style.opacity
        })
        this.currentShapeGroup.konvaGroup.add(this.ellipse)
        window.addEventListener('mouseup', this.globalPointerUpHandler)
    }

    protected mouseMoveHandler(e: KonvaEventObject<PointerEvent>) {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault()
        this.ellipse.show()
        const pos = this.konvaStage.getRelativePointerPosition()
        const radiusX = Math.abs(pos.x - this.vertex.x) / 2
        const radiusY = Math.abs(pos.y - this.vertex.y) / 2
        const areaAttr = {
            x: (pos.x - this.vertex.x) / 2 + this.vertex.x,
            y: (pos.y - this.vertex.y) / 2 + this.vertex.y,
            radiusX,
            radiusY
        }
        this.ellipse.setAttrs(areaAttr)
    }

    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }
        this.isPainting = false
        // 如果图形是隐藏状态，将图形从画布和MAP上移除
        const group = this.ellipse.getParent()
        if (!this.ellipse.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }
        if (this.isTooSmall()) {
            this.ellipse.destroy()
            this.delShapeGroup(group.id())
            this.ellipse = null
            return
        }
        const { x, y, radiusX, radiusY } = this.ellipse.attrs
        this.setShapeGroupDone(
            group.id(),
            this.calculateEllipseForStorage({
                x,
                y,
                radiusX,
                radiusY,
                annotationType: this.currentAnnotation.pdfjsType,
                color: getRGB(this.currentAnnotation.style.color),
                thickness: this.currentAnnotation.style.strokeWidth || 2,
                opacity: this.currentAnnotation.style.opacity,
                pageIndex: this.pageNumber - 1
            })
        )
        this.ellipse = null
    }

    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // 只处理左键释放
        this.mouseUpHandler()
        // Remove global listeners
        window.removeEventListener('mouseup', this.globalPointerUpHandler)
    }

    public async refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore) {
        const ghostGroup = Konva.Node.create(groupString)
        const ellipse = this.getGroupNodesByClassName(ghostGroup, 'Ellipse')[0] as Konva.Ellipse
        const { x, y, radiusX, radiusY } = this.fixShapeCoordinateForGroup(ellipse, ghostGroup)

        return this.calculateEllipseForStorage({
            x,
            y,
            radiusX,
            radiusY,
            annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
            color: rawAnnotationStore.pdfjsAnnotationStorage.color,
            thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
            opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
            pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
        })
    }

    private fixShapeCoordinateForGroup(shape: Konva.Ellipse, group: Konva.Group) {
        // 获取组的全局变换
        const groupTransform = group.getTransform()
        // 获取椭圆在组内的局部坐标
        const localX = shape.attrs.x
        const localY = shape.attrs.y
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
     * @description 将Ellipse数据转为annotationStorage需要的数据
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
        color: any
        thickness: number
        opacity: number
        pageIndex: number
    }): IPdfjsAnnotationStorage {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y
        const halfInterval: number = 0.5
        const points: number[] = []
        // 计算椭圆周上的点
        for (let angle = 0; angle <= 360; angle += halfInterval) {
            const radians = (angle * Math.PI) / 180
            const pointX = x + radiusX * Math.cos(radians)
            const pointY = y + radiusY * Math.sin(radians)
            points.push(pointX, canvasHeight - pointY)
        }
        // 计算矩形的左上角和右下角顶点坐标
        const rect: [number, number, number, number] = [x - radiusX * 2, canvasHeight - (y + radiusY * 2), x + radiusX * 2, canvasHeight - (y - radiusY * 2)]
        return {
            annotationType,
            color,
            thickness,
            opacity,
            paths: [{ bezier: points, points: points }],
            pageIndex,
            rect: rect,
            rotation: 0
        }
    }
    private isTooSmall(): boolean {
        const { width, height } = this.ellipse.size()
        return Math.max(width, height) < Editor.MinSize
    }

    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}
}
