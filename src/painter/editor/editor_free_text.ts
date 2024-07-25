import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { base64ToImageBitmap } from '../../utils/utils'
import { FREE_TEXT_TEXT_CLASS_NAME } from '../const'
import { Editor, IEditorOptions } from './editor'

/**
 * EditorFreeText 是继承自 Editor 的自由文本编辑器类。
 */
export class EditorFreeText extends Editor {
    /**
     * 创建一个 EditorFreeText 实例。
     * @param EditorOptions 初始化编辑器的选项
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.FREETEXT })
    }

    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}
    protected mouseDownHandler() {}
    protected mouseMoveHandler() {}

    /**
     * 处理鼠标抬起事件，创建输入区域。
     * @param e Konva 事件对象
     */
    protected mouseUpHandler(e: KonvaEventObject<PointerEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        this.createInputArea(e)
    }

    /**
     * 创建输入区域（textarea）并设置样式。
     * @param e Konva 事件对象
     */
    private createInputArea(e: KonvaEventObject<PointerEvent>) {
        const pos = this.konvaStage.getRelativePointerPosition()
        const { x, y } = this.konvaStage.scale()

        // 创建和配置 textarea 元素
        const inputArea = document.createElement('textarea')
        this.setupInputAreaStyles(
            inputArea,
            {
                x: e.evt.offsetX,
                y: e.evt.offsetY
            },
            y
        )
        this.konvaStage.container().append(inputArea)

        // 设置初始焦点和选中状态
        setTimeout(() => {
            inputArea.focus()
            inputArea.select()
        }, 100)

        // 注册事件监听器
        this.addInputAreaEventListeners(inputArea, { x, y }, pos)
    }

    /**
     * 设置 textarea 的样式和初始配置。
     * @param inputArea textarea 元素
     * @param evt 鼠标事件坐标
     * @param scaleY Y 轴缩放比例
     */
    private setupInputAreaStyles(inputArea: HTMLTextAreaElement, evt: { x: number; y: number }, scaleY: number) {
        inputArea.placeholder = '开始输入...'
        inputArea.rows = 1
        inputArea.className = FREE_TEXT_TEXT_CLASS_NAME

        // 使用 CSS 类管理样式而不是内联样式
        inputArea.style.width = '200px'
        inputArea.style.left = `${evt.x}px`
        inputArea.style.top = `${evt.y}px`
        inputArea.style.height = `${this.currentAnnotation.style.fontSize * scaleY + 6}px`
        inputArea.style.fontSize = `${this.currentAnnotation.style.fontSize * scaleY}px`
        inputArea.style.color = this.currentAnnotation.style.color
    }

    /**
     * 注册 textarea 的事件监听器。
     * @param inputArea textarea 元素
     * @param scaleY Y 轴缩放比例
     * @param pos 相对位置坐标
     */
    private addInputAreaEventListeners(inputArea: HTMLTextAreaElement, scale: { x: number; y: number }, pos: { x: number; y: number }) {
        // 动态调整 textarea 的高度以适应输入内容
        inputArea.addEventListener('input', e => this.adjustTextareaHeight(e))

        // 失去焦点时处理
        inputArea.addEventListener('blur', async e => {
            const target = e.target as HTMLTextAreaElement
            if (target.getAttribute('del') === 'true') {
                this.removeInputArea(target)
            } else {
                this.inputDoneHandler(target, scale, pos)
            }
        })

        // 处理键盘事件
        inputArea.addEventListener('keydown', e => this.handleInputAreaKeydown(e, scale.y))
    }

    /**
     * 动态调整 textarea 的高度。
     * @param event 输入事件对象
     */
    private adjustTextareaHeight(event: Event) {
        const element = event.target as HTMLTextAreaElement
        element.style.height = 'auto' // 重置高度以重新计算
        const scrollHeight = element.scrollHeight
        element.style.height = `${scrollHeight}px` // 设置为内容的实际高度
    }

    /**
     * 处理 textarea 的键盘事件。
     * @param e 键盘事件对象
     * @param scaleY Y 轴缩放比例
     */
    private handleInputAreaKeydown(e: KeyboardEvent, scaleY: number) {
        const target = e.target as HTMLTextAreaElement
        const scrollHeight = target.scrollHeight

        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // 允许在按住 Shift 键的情况下换行
                target.style.height = `${scrollHeight + this.currentAnnotation.style.fontSize * scaleY}px`
            } else {
                e.preventDefault()
                e.stopPropagation()
                target.blur() // 完成输入并失去焦点
            }
        }

        if (e.key === 'Escape') {
            target.setAttribute('del', 'true') // 标记为删除状态
            e.preventDefault()
            e.stopPropagation()
            target.blur() // 取消输入并失去焦点
        }
    }

    /**
     * 处理输入完成后的操作。
     * @param inputArea textarea 元素
     * @param scaleY Y 轴缩放比例
     * @param pos 相对位置坐标
     */
    private async inputDoneHandler(inputArea: HTMLTextAreaElement, scale: { x: number; y: number }, pos: { x: number; y: number }) {
        const value = inputArea.value.trim()
        inputArea.remove()

        if (value === '') {
            this.delShapeGroup(this.currentShapeGroup.id)
            this.currentShapeGroup = null
            return
        }
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y + 2,
            text: value,
            fontSize: this.currentAnnotation.style.fontSize,
            fill: this.currentAnnotation.style.color,
            padding: 2
        })

        this.currentShapeGroup.konvaGroup.add(text)

        // 将 Text 节点转换为 Image
        const imageUrl = await new Promise<string>(resolve => {
            text.toDataURL({
                callback: url => resolve(url)
            })
        })

        // 使用生成的 imageUrl 创建 Konva.Image
        Konva.Image.fromURL(imageUrl, async image => {
            const { width: width_rec, height: height_rec } = text.getClientRect()
            // 删除之前的文本节点
            this.getGroupNodesByClassName(this.currentShapeGroup.konvaGroup, 'Text')[0]?.destroy()
            this.currentShapeGroup.konvaGroup.add(image)
            image.setAttrs({
                x: pos.x,
                y: pos.y,
                width: width_rec / scale.x,
                height: height_rec / scale.y,
                base64: imageUrl
            })

            // 修正图像的坐标和尺寸
            const { x, y, width, height } = this.fixImageCoordinateForGroup(image, this.currentShapeGroup.konvaGroup)
            const id = this.currentShapeGroup.konvaGroup.id()

            // 计算并保存图像的存储信息
            const storage = await this.calculateImageForStorage({
                x,
                y,
                width,
                height,
                annotationType: this.currentAnnotation.pdfjsType,
                pageIndex: this.pageNumber - 1,
                imageUrl,
                id
            })

            // 标记当前形状组为完成状态
            this.setShapeGroupDone(id, storage, {
                image: imageUrl
            })
        })
    }

    /**
     * 移除输入区域（textarea）并删除对应的形状组。
     * @param inputArea textarea 元素
     */
    private removeInputArea(inputArea: HTMLTextAreaElement) {
        inputArea.remove()
        inputArea = null
        this.delShapeGroup(this.currentShapeGroup.id)
    }

    /**
     * 刷新 PDF.js 注解存储，返回计算后的存储信息。
     * @param groupId 形状组的 ID
     * @param groupString 序列化的组字符串
     * @param rawAnnotationStore 原始注解存储对象
     * @returns 返回注解的存储信息 IPdfjsAnnotationStorage 的 Promise
     */
    public async refreshPdfjsAnnotationStorage(
        groupId: string,
        groupString: string,
        rawAnnotationStore: IAnnotationStore
    ): Promise<{ annotationStorage: IPdfjsAnnotationStorage; batchPdfjsAnnotationStorage?: IPdfjsAnnotationStorage[] }> {
        const ghostGroup = Konva.Node.create(groupString)
        const image = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image

        const { x, y, width, height } = this.fixImageCoordinateForGroup(image, ghostGroup)

        // 计算并返回注解的存储信息
        const annotationStorage = await this.calculateImageForStorage({
            x,
            y,
            width,
            height,
            annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
            pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex,
            imageUrl: image.getAttr('base64'),
            id: groupId
        })

        return { annotationStorage }
    }

    /**
     * 修正图像在组中的坐标和尺寸，返回全局坐标和尺寸。
     * @param image Konva.Image 对象
     * @param group Konva.Group 对象
     * @returns 返回修正后的坐标和尺寸 { x, y, width, height }
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
     * 计算图像的存储信息，并返回 IPdfjsAnnotationStorage 对象。
     * @param param0 包含图像信息的参数对象
     * @returns 返回 Promise<IPdfjsAnnotationStorage> 对象
     */
    private async calculateImageForStorage({
        x,
        y,
        width,
        height,
        annotationType,
        pageIndex,
        imageUrl,
        id
    }: {
        x: number
        y: number
        width: number
        height: number
        annotationType: PdfjsAnnotationEditorType
        pageIndex: number
        imageUrl: string
        id: string
    }): Promise<IPdfjsAnnotationStorage> {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y

        // 计算矩形的右下角顶点坐标
        const rectBottomRightX: number = x + width
        const rectBottomRightY: number = y + height
        const rect: [number, number, number, number] = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY]

        // 构造并返回注解的存储信息对象
        const annotationStorage: IPdfjsAnnotationStorage = {
            annotationType,
            isSvg: false,
            bitmap: await base64ToImageBitmap(imageUrl),
            bitmapId: `image_${id}`,
            pageIndex,
            rect: rect,
            rotation: 0
        }

        return annotationStorage
    }

    /**
     * 将序列化的组字符串添加到 Konva 舞台的背景层中。
     * @param konvaStage Konva 舞台对象
     * @param konvaString 序列化的 Konva 字符串
     */
    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString)
        const oldImage = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        const imageUrl = oldImage.getAttr('base64')

        // 使用 imageUrl 创建新的 Konva.Image
        Konva.Image.fromURL(imageUrl, async image => {
            image.setAttrs(oldImage.getAttrs())
            oldImage.destroy()
            ghostGroup.add(image)
        })

        // 将组添加到背景层
        this.getBgLayer(konvaStage).add(ghostGroup)
    }
}
