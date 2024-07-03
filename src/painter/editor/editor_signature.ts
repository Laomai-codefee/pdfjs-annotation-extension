import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { IEditorOptions, Editor } from './editor'
import { AnnotationType, DefaultSettings, IAnnotationStore, IAnnotationType, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { base64ToImageBitmap, resizeImage, setCssCustomProperty } from '../../utils/utils'
import { CURSOR_CSS_PROPERTY } from '../const'

export class EditorSignature extends Editor {
    private signatureUrl: string

    private signatureImage: Konva.Image

    constructor(EditorOptions: IEditorOptions, defaultSignatureUrl: string | null) {
        super({ ...EditorOptions, editorType: AnnotationType.SIGNATURE })
        this.signatureUrl = defaultSignatureUrl
        if (defaultSignatureUrl) {
            this.createCursorImg()
        }
    }
    // 创建鼠标指针图片
    private createCursorImg() {
        const cursorGroup = new Konva.Group({
            draggable: false
        })
        Konva.Image.fromURL(this.signatureUrl, image => {
            const { width, height } = image.getClientRect()
            const { newWidth, newHeight } = resizeImage(width, height, DefaultSettings.MAX_CURSOR_SIZE)
            const crosshair = { x: newWidth / 2, y: newHeight / 2 }

            const border = new Konva.Rect({
                x: 0,
                y: 0,
                width:newWidth,
                height: newHeight,
                stroke: 'red',
                strokeWidth: 2
            })

            const horizontalLine = new Konva.Line({
                points: [0, crosshair.y, newWidth, crosshair.y],
                stroke: 'red',
                strokeWidth: 1,
                dash: [5, 5]
            })
            const verticalLine = new Konva.Line({
                points: [crosshair.x, 0, crosshair.x, newHeight],
                stroke: 'red',
                strokeWidth: 1,
                dash: [5, 5]
            })

            const point = new Konva.Circle({
                width: 10,
                height: 10,
                x: crosshair.x,
                y: crosshair.y,
                stroke: 'red'
            })

            image.setAttrs({
                x: 0,
                y: 0,
                width: newWidth,
                height: newHeight,
                visible: true
            })
            cursorGroup.add(image, horizontalLine, verticalLine, point, border)
            const cursorImg = cursorGroup.toDataURL()
            cursorGroup.destroy()
            setCssCustomProperty(CURSOR_CSS_PROPERTY, `url(${cursorImg}) ${crosshair.x} ${crosshair.y}, default`)
        })
    }

    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.signatureImage = null
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        const pos = this.konvaStage.getRelativePointerPosition()
        Konva.Image.fromURL(this.signatureUrl, async image => {
            const { width: width_rec, height: height_rec } = image.getClientRect()
            const { newWidth, newHeight } = resizeImage(width_rec, height_rec, 120)
            const crosshair = { x: newWidth / 2, y: newHeight / 2 }
            this.signatureImage = image
            this.signatureImage.setAttrs({
                x: pos.x - crosshair.x,
                y: pos.y - crosshair.y,
                width: newWidth,
                height: newHeight,
                base64: this.signatureUrl
            })
            this.currentShapeGroup.konvaGroup.add(this.signatureImage)
            const { x, y, width, height } = this.fixImageCoordinateForGroup(this.signatureImage, this.currentShapeGroup.konvaGroup)
            const id = this.currentShapeGroup.konvaGroup.id()
            this.setShapeGroupDone(
                id,
                await this.calculateImageForStorage({
                    x,
                    y,
                    width,
                    height,
                    annotationType: this.currentAnnotation.pdfjsType,
                    pageIndex: this.pageNumber - 1,
                    signatureUrl: this.signatureUrl,
                    id
                }),
                {
                    image: this.signatureUrl
                }
            )
            this.signatureImage = null
        })
    }

    public async refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore) {
        const ghostGroup = Konva.Node.create(groupString)
        const image = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const { x, y, width, height } = this.fixImageCoordinateForGroup(image, ghostGroup)
        const annotationStorage = await this.calculateImageForStorage({
            x,
            y,
            width,
            height,
            annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
            pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex,
            signatureUrl: image.getAttr('base64'),
            id: groupId
        })
        return annotationStorage
    }

    private fixImageCoordinateForGroup(image: Konva.Image, group: Konva.Group) {
        const imageLocalRect = image.getClientRect({ relativeTo: group })

        // 获取组的全局变换
        const groupTransform = group.getTransform()

        // 使用组的变换将局部坐标转换为全局坐标
        const imageGlobalPos = groupTransform.point({
            x: imageLocalRect.x,
            y: imageLocalRect.y
        })

        // 计算形状的全局宽度和高度
        const globalWidth = imageLocalRect.width * (group.attrs.scaleX || 1)
        const globalHeight = imageLocalRect.height * (group.attrs.scaleY || 1)

        return {
            x: imageGlobalPos.x,
            y: imageGlobalPos.y,
            width: globalWidth,
            height: globalHeight
        }
    }

    /**
     * @description 将Image数据转为annotationStorage需要的数据
     */
    private async calculateImageForStorage({
        x,
        y,
        width,
        height,
        annotationType,
        pageIndex,
        signatureUrl,
        id
    }: {
        x: number
        y: number
        width: number
        height: number
        annotationType: PdfjsAnnotationEditorType
        pageIndex: number
        signatureUrl: string
        id: string
    }): Promise<IPdfjsAnnotationStorage> {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y
        const rectBottomRightX: number = x + width
        const rectBottomRightY: number = y + height
        const rect: [number, number, number, number] = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY]
        const annotationStorage: IPdfjsAnnotationStorage = {
            annotationType,
            isSvg: false,
            bitmap: await base64ToImageBitmap(signatureUrl),
            bitmapId: `image_${id}`,
            pageIndex,
            rect: rect,
            rotation: 0
        }
        return Promise.resolve(annotationStorage)
    }

    protected mouseMoveHandler() {}
    protected mouseUpHandler() {}
    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}

    public activateWithSignature(konvaStage: Konva.Stage, annotation: IAnnotationType, signatureUrl: string | null) {
        super.activate(konvaStage, annotation)
        this.signatureUrl = signatureUrl
        if (signatureUrl) {
            this.createCursorImg()
        }
    }
    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString)
        const oldImage = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const imageUrl = oldImage.getAttr('base64')
        Konva.Image.fromURL(imageUrl, async image => {
            image.setAttrs(oldImage.getAttrs())
            oldImage.destroy()
            ghostGroup.add(image)
        })
        this.getBgLayer(konvaStage).add(ghostGroup)
    }
}
