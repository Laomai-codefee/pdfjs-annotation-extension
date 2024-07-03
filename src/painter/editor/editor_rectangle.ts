import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { IEditorOptions, Editor } from './editor'
import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'

export class EditorRectangle extends Editor {
    private rect: Konva.Rect // 当前正在绘制的图形

    private vertex: {
        x: number
        y: number
    }

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.RECTANGLE })
        this.rect = null
        this.vertex = {
            x: 0,
            y: 0
        }
    }

    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.rect = null
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        const pos = this.konvaStage.getRelativePointerPosition()
        this.vertex = {
            x: pos.x,
            y: pos.y
        }
        this.rect = new Konva.Rect({
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            visible: false,
            // hitStrokeWidth: 10,
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth || 2,
            opacity: this.currentAnnotation.style.opacity
        })
        this.currentShapeGroup.konvaGroup.add(this.rect)
        window.addEventListener('mouseup', this.globalPointerUpHandler)
    }

    protected mouseMoveHandler(e: KonvaEventObject<PointerEvent>) {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault()
        this.rect.show()
        const pos = this.konvaStage.getRelativePointerPosition()
        const areaAttr = {
            x: Math.min(this.vertex.x, pos.x),
            y: Math.min(this.vertex.y, pos.y),
            width: Math.abs(pos.x - this.vertex.x),
            height: Math.abs(pos.y - this.vertex.y)
        }
        this.rect.setAttrs(areaAttr)
    }

    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }
        this.isPainting = false
        // 如果图形是隐藏状态，将图形从画布和MAP上移除
        const group = this.rect.getParent()
        if (!this.rect.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }
        if (this.isTooSmall()) {
            this.rect.destroy()
            this.delShapeGroup(group.id())
            this.rect = null
            return
        }
        const { x, y, width, height } = this.fixShapeCoordinateForGroup(this.rect, this.currentShapeGroup.konvaGroup)
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
        )
        this.rect = null
    }

    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // 只处理左键释放
        this.mouseUpHandler()
        // Remove global listeners
        window.removeEventListener('mouseup', this.globalPointerUpHandler)
    }

    public async refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore) {
        const ghostGroup = Konva.Node.create(groupString)
        const rect = this.getGroupNodesByClassName(ghostGroup, 'Rect')[0] as Konva.Rect
        const { x, y, width, height } = this.fixShapeCoordinateForGroup(rect, ghostGroup)
        return this.calculateRectForStorage({
            x,
            y,
            width,
            height,
            annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
            color: rawAnnotationStore.pdfjsAnnotationStorage.color,
            thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
            opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
            pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
        })
    }

    private fixShapeCoordinateForGroup(shape: Konva.Rect, group: Konva.Group) {
        // 获取形状在组中的局部坐标
        const shapeLocalRect = shape.getClientRect({ relativeTo: group })

        // 获取组的全局变换
        const groupTransform = group.getTransform()

        // 使用组的变换将局部坐标转换为全局坐标
        const shapeGlobalPos = groupTransform.point({
            x: shapeLocalRect.x,
            y: shapeLocalRect.y
        })

        // 计算形状的全局宽度和高度
        const globalWidth = shapeLocalRect.width * (group.attrs.scaleX || 1)
        const globalHeight = shapeLocalRect.height * (group.attrs.scaleY || 1)

        return {
            x: shapeGlobalPos.x,
            y: shapeGlobalPos.y,
            width: globalWidth,
            height: globalHeight
        }
    }

    /**
     * @description 将rect数据转为annotationStorage需要的数据
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
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y
        const halfInterval: number = 0.5
        const points: number[] = []
        // 计算矩形的右下角顶点坐标
        const rectBottomRightX: number = x + width
        const rectBottomRightY: number = y + height
        const rect: [number, number, number, number] = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY]
        // 添加左边缘上的点
        for (let i = y; i < rectBottomRightY; i += halfInterval) {
            points.push(x, canvasHeight - i)
        }
        // 添加底边缘上的点
        for (let i = x + halfInterval; i < rectBottomRightX; i += halfInterval) {
            points.push(i, canvasHeight - rectBottomRightY)
        }
        // 添加右边缘上的点
        for (let i = rectBottomRightY - halfInterval; i >= y; i -= halfInterval) {
            points.push(rectBottomRightX, canvasHeight - i)
        }
        // 添加顶边缘上的点
        for (let i = rectBottomRightX - halfInterval; i >= x + halfInterval; i -= halfInterval) {
            points.push(i, canvasHeight - y)
        }
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
        const { width, height } = this.rect.size()
        return Math.max(width, height) < Editor.MinSize
    }

    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}
}
