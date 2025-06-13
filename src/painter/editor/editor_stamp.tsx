import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationType } from '../../const/definitions'
import { resizeImage, setCssCustomProperty } from '../../utils/utils'
import { CURSOR_CSS_PROPERTY } from '../const'
import { Editor, IEditorOptions } from './editor'
import { defaultOptions } from '../../const/default_options'

/**
 * EditorStamp 是继承自 Editor 的签章编辑器类。
 */
export class EditorStamp extends Editor {
    private stampUrl: string // 签章图片的 URL
    private stampImage: Konva.Image // Konva.Image 对象用于显示签章图片

    /**
     * 创建一个 EditorStamp 实例。
     * @param EditorOptions 初始化编辑器的选项
     * @param defaultStampUrl 默认的签章图片 URL
     */
    constructor(EditorOptions: IEditorOptions, defaultStampUrl: string | null) {
        super({ ...EditorOptions, editorType: AnnotationType.STAMP }) // 调用父类的构造函数
        this.stampUrl = defaultStampUrl // 设置签章图片 URL
        if (defaultStampUrl) {
            this.createCursorImg() // 如果有默认签章图片 URL，则创建光标图像
        }
    }

    /**
     * 创建光标图像，并设置 CSS 自定义属性。
     */
    private createCursorImg() {
        const cursorGroup = new Konva.Group({
            draggable: false
        })

        // 从 URL 加载签章图片并处理
        Konva.Image.fromURL(this.stampUrl, image => {
            const { width, height } = image.getClientRect()
            const { newWidth, newHeight } = resizeImage(width, height, defaultOptions.setting.MAX_CURSOR_SIZE)
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

            // 设置签章图片属性并添加到组中
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
     * 处理鼠标按下事件的方法，创建新的形状组并添加签章图片。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return // 如果事件不是在舞台上发生的，则直接返回
        }
        this.stampImage = null
        this.currentShapeGroup = this.createShapeGroup() // 创建新的形状组
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup) // 将形状组添加到背景图层
        const pos = this.konvaStage.getRelativePointerPosition()

        // 从 URL 加载签章图片并处理
        Konva.Image.fromURL(this.stampUrl, async image => {
            const { width: width_rec, height: height_rec } = image.getClientRect()
            const { newWidth, newHeight } = resizeImage(width_rec, height_rec, 120)
            const crosshair = { x: newWidth / 2, y: newHeight / 2 }

            this.stampImage = image
            this.stampImage.setAttrs({
                x: pos.x - crosshair.x,
                y: pos.y - crosshair.y,
                width: newWidth,
                height: newHeight,
                base64: this.stampUrl
            })
            this.currentShapeGroup.konvaGroup.add(this.stampImage)
            const id = this.currentShapeGroup.konvaGroup.id()
            this.setShapeGroupDone(
                {
                    id,
                    contentsObj: {
                        text: '',
                        image: this.stampUrl
                    },
                }
            )

            this.stampImage = null
        })
    }

    /**
     * 激活编辑器并设置签章图片。
     * @param konvaStage Konva 舞台对象
     * @param annotation 新的注解对象
     * @param stampUrl 签章图片的 URL
     */
    public activateWithStamp(konvaStage: Konva.Stage, annotation: IAnnotationType, stampUrl: string | null) {
        super.activate(konvaStage, annotation) // 调用父类的激活方法
        this.stampUrl = stampUrl // 设置签章图片 URL
        if (stampUrl) {
            this.createCursorImg() // 如果有签章图片 URL，则创建光标图像
        }
    }

    /**
     * 将序列化的 Konva.Group 添加到图层，并恢复其中的签章图片。
     * @param konvaStage Konva 舞台对象
     * @param konvaString 序列化的 Konva.Group 字符串表示
     */
    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString)
        const oldImage = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const imageUrl = oldImage.getAttr('base64')
        const oldText = this.getGroupNodesByClassName(ghostGroup, 'Text')[0] as Konva.Text
        // 从 URL 加载签章图片并替换旧图片
        Konva.Image.fromURL(imageUrl, async image => {
            image.setAttrs(oldImage.getAttrs())
            oldImage.destroy()
            ghostGroup.add(image)
            if (oldText) {
                oldText.moveToTop()
            }
        })

        // 将恢复后的组添加到背景图层
        this.getBgLayer(konvaStage).add(ghostGroup)
    }

    // 以下是未实现的抽象方法的空实现
    protected mouseMoveHandler() { }
    protected mouseUpHandler() { }

    protected changeStyle(): void {}
}
