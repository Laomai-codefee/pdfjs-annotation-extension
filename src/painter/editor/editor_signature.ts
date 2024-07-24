import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, DefaultSettings, IAnnotationStore, IAnnotationType, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { base64ToImageBitmap, resizeImage, setCssCustomProperty } from '../../utils/utils'
import { CURSOR_CSS_PROPERTY } from '../const'
import { Editor, IEditorOptions } from './editor'

/**
 * EditorSignature 是继承自 Editor 的签名编辑器类。
 */
export class EditorSignature extends Editor {
    private signatureUrl: string // 签名图片的 URL
    private signatureImage: Konva.Image // Konva.Image 对象用于显示签名图片

    /**
     * 创建一个 EditorSignature 实例。
     * @param EditorOptions 初始化编辑器的选项
     * @param defaultSignatureUrl 默认的签名图片 URL
     */
    constructor(EditorOptions: IEditorOptions, defaultSignatureUrl: string | null) {
        super({ ...EditorOptions, editorType: AnnotationType.SIGNATURE }) // 调用父类的构造函数
        this.signatureUrl = defaultSignatureUrl // 设置签名图片 URL
        if (defaultSignatureUrl) {
            this.createCursorImg() // 如果有默认签名图片 URL，则创建光标图像
        }
    }

    /**
     * 创建光标图像，并设置 CSS 自定义属性。
     */
    private createCursorImg() {
        const cursorGroup = new Konva.Group({
            draggable: false
        })

        // 从 URL 加载签名图片并处理
        Konva.Image.fromURL(this.signatureUrl, image => {
            const { width, height } = image.getClientRect()
            const { newWidth, newHeight } = resizeImage(width, height, DefaultSettings.MAX_CURSOR_SIZE)
            const crosshair = { x: newWidth / 2, y: newHeight / 2 }

            // 创建边框和交叉线
            const border = new Konva.Rect({
                x: 0,
                y: 0,
                width: newWidth,
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
                x: crosshair.x,
                y: crosshair.y,
                radius: 5,
                stroke: 'red'
            })

            // 设置签名图片属性并添加到组中
            image.setAttrs({
                x: 0,
                y: 0,
                width: newWidth,
                height: newHeight,
                visible: true
            })
            cursorGroup.add(image, horizontalLine, verticalLine, point, border)

            // 将组转换为数据 URL，并设置 CSS 自定义属性
            const cursorImg = cursorGroup.toDataURL()
            cursorGroup.destroy()
            setCssCustomProperty(CURSOR_CSS_PROPERTY, `url(${cursorImg}) ${crosshair.x} ${crosshair.y}, default`)
        })
    }

    /**
     * 处理鼠标按下事件的方法，创建新的形状组并添加签名图片。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return // 如果事件不是在舞台上发生的，则直接返回
        }
        this.signatureImage = null
        this.currentShapeGroup = this.createShapeGroup() // 创建新的形状组
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup) // 将形状组添加到背景图层
        const pos = this.konvaStage.getRelativePointerPosition()

        // 从 URL 加载签名图片并处理
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

            // 调整图片坐标并更新 PDF.js 注解存储
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

    /**
     * 刷新 PDF.js 注解存储，从序列化的组字符串中恢复签名图片的信息。
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
        const ghostGroup = Konva.Node.create(groupString)
        const image = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const { x, y, width, height } = this.fixImageCoordinateForGroup(image, ghostGroup)

        // 计算并返回更新后的 PDF.js 注解存储对象
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
        return { annotationStorage }
    }

    /**
     * 调整签名图片在组内的坐标。
     * @param image Konva.Image 对象
     * @param group Konva.Group 对象
     * @returns 返回调整后的坐标信息
     */
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
     * 将签名图片数据转换为 PDF.js 注解存储所需的数据格式。
     * @param param0 包含签名图片和相关信息的参数
     * @returns 返回处理后的 PDF.js 注解存储对象的 Promise
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

        // 构造 PDF.js 注解存储对象
        const annotationStorage: IPdfjsAnnotationStorage = {
            annotationType,
            isSvg: false,
            bitmap: await base64ToImageBitmap(signatureUrl),
            bitmapId: `image_${id}`,
            pageIndex,
            rect,
            rotation: 0
        }
        return annotationStorage
    }
    /**
     * 激活编辑器并设置签名图片。
     * @param konvaStage Konva 舞台对象
     * @param annotation 新的注解对象
     * @param signatureUrl 签名图片的 URL
     */
    public activateWithSignature(konvaStage: Konva.Stage, annotation: IAnnotationType, signatureUrl: string | null) {
        super.activate(konvaStage, annotation) // 调用父类的激活方法
        this.signatureUrl = signatureUrl // 设置签名图片 URL
        if (signatureUrl) {
            this.createCursorImg() // 如果有签名图片 URL，则创建光标图像
        }
    }

    /**
     * 将序列化的 Konva.Group 添加到图层，并恢复其中的签名图片。
     * @param konvaStage Konva 舞台对象
     * @param konvaString 序列化的 Konva.Group 字符串表示
     */
    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString)
        const oldImage = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const imageUrl = oldImage.getAttr('base64')

        // 从 URL 加载签名图片并替换旧图片
        Konva.Image.fromURL(imageUrl, async image => {
            image.setAttrs(oldImage.getAttrs())
            oldImage.destroy()
            ghostGroup.add(image)
        })

        // 将恢复后的组添加到背景图层
        this.getBgLayer(konvaStage).add(ghostGroup)
    }

    // 下面是未实现的抽象方法的空实现
    protected mouseMoveHandler() {}
    protected mouseUpHandler() {}
    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}
}
