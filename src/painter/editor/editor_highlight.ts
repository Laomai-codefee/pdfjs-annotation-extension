import Konva from 'konva'

import { AnnotationType, IPdfjsAnnotationStorage } from '../../const/definitions'
import { getRGB } from '../../utils/utils'
import { Editor, IEditorOptions } from './editor'

/**
 * EditorHighLight 是继承自 Editor 的高亮编辑器类。
 */
export class EditorHighLight extends Editor {
    /**
     * 创建一个 EditorHighLight 实例。
     * @param EditorOptions 初始化编辑器的选项
     * @param editorType 注释类型
     */
    constructor(EditorOptions: IEditorOptions, editorType: AnnotationType) {
        super({ ...EditorOptions, editorType })
    }

    /**
     * 将网页上选中文字区域转换为图形并绘制在 Canvas 上。
     * @param elements HTMLSpanElement 数组，表示要绘制的元素
     * @param fixElement 用于修正计算的元素
     */
    public convertTextSelection(elements: HTMLSpanElement[], fixElement: HTMLDivElement) {
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        // 获取基准元素的边界矩形，用于计算相对坐标
        const fixBounding = fixElement.getBoundingClientRect()

        elements.forEach(spanEl => {
            const bounding = spanEl.getBoundingClientRect()
            const { x, y, width, height } = this.calculateRelativePosition(bounding, fixBounding)
            const shape = this.createShape(x, y, width, height)
            this.currentShapeGroup.konvaGroup.add(shape)
        })

        this.setShapeGroupDone(this.currentShapeGroup.id, this.calculateHighlightForStorage(), {
            text: this.getElementOuterText(elements)
        })
    }

    /**
     * 获取所有 elements 内部文字。
     * @param elements HTMLSpanElement 数组
     * @returns 所有元素内部文字的字符串
     */
    private getElementOuterText(elements: HTMLSpanElement[]): string {
        return elements.map(el => el.outerText).join('')
    }

    /**
     * 计算元素的相对位置和尺寸，适配 Canvas 坐标系。
     * @param elementBounding 元素的边界矩形
     * @param fixBounding 基准元素的边界矩形
     * @returns 相对位置和尺寸的对象 { x, y, width, height }
     */
    private calculateRelativePosition(elementBounding: DOMRect, fixBounding: DOMRect) {
        const scale = this.konvaStage.scale()
        const x = (elementBounding.x - fixBounding.x) / scale.x
        const y = (elementBounding.y - fixBounding.y) / scale.y
        const width = elementBounding.width / scale.x
        const height = elementBounding.height / scale.y
        return { x, y, width, height }
    }

    /**
     * 根据当前的注释类型创建对应的形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Shape 具体类型的形状
     */
    private createShape(x: number, y: number, width: number, height: number): Konva.Shape {
        switch (this.currentAnnotation.type) {
            case AnnotationType.HIGHLIGHT:
                return this.createHighlightShape(x, y, width, height)
            case AnnotationType.UNDERLINE:
                return this.createUnderlineShape(x, y, width, height)
            case AnnotationType.STRIKEOUT:
                return this.createStrikeoutShape(x, y, width, height)
            default:
                throw new Error(`Unsupported annotation type: ${this.currentAnnotation.type}`)
        }
    }

    /**
     * 创建高亮形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 高亮形状对象
     */
    private createHighlightShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y,
            width,
            height,
            opacity: this.currentAnnotation.style.opacity || 0.5,
            fill: this.currentAnnotation.style.color
        })
    }

    /**
     * 创建下划线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 下划线形状对象
     */
    private createUnderlineShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y: height + y - 2,
            width,
            stroke: this.currentAnnotation.style.color,
            opacity: this.currentAnnotation.style.opacity,
            strokeWidth: 1,
            hitStrokeWidth: 10,
            height: 1
        })
    }

    /**
     * 创建删除线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 删除线形状对象
     */
    private createStrikeoutShape(x: number, y: number, width: number, height: number): Konva.Rect {
        return new Konva.Rect({
            x,
            y: y + height / 2,
            width,
            stroke: this.currentAnnotation.style.color,
            opacity: this.currentAnnotation.style.opacity,
            strokeWidth: 1,
            hitStrokeWidth: 10,
            height: 1
        })
    }

    /**
     * 刷新 PDF.js 注解存储，目前未实现具体逻辑。
     * @param groupId 形状组的 ID
     * @param groupString 序列化的组字符串
     * @returns 返回空 Promise
     */
    public async refreshPdfjsAnnotationStorage(): Promise<null> {
        return null
    }

    /**
     * 计算并存储当前高亮注释信息。
     * @returns 返回高亮注释的存储信息 IPdfjsAnnotationStorage
     */
    private calculateHighlightForStorage(): IPdfjsAnnotationStorage {
        const allHighlights: Konva.Rect[] = this.getNodesByClassName<Konva.Rect>('Rect')
        const quadPoints: number[] = []
        const outlines: number[][] = []

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y

        allHighlights.forEach(shape => {
            const { x, y, width, height } = shape.attrs

            // 计算矩形的四个顶点坐标，并转换到 PDF.js 坐标系
            const topLeft = [x, canvasHeight - y]
            const bottomLeft = [x, canvasHeight - (y + height)]
            const bottomRight = [x + width, canvasHeight - (y + height)]
            const topRight = [x + width, canvasHeight - y]

            // 对于 outlines，顺序是：左上，左下，右下，右上
            const rectOutlines = [...topLeft, ...bottomLeft, ...bottomRight, ...topRight]
            outlines.push(rectOutlines)

            // 对于 quadPoints，顺序是：左上，右上，左下，右下
            const rectQuadPoints = [...topLeft, ...topRight, ...bottomLeft, ...bottomRight]
            quadPoints.push(...rectQuadPoints)

            // 更新边界
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x + width)
            maxY = Math.max(maxY, y + height)
        })

        // 构建包含所有形状的边界矩形 (rect)
        const rect: [number, number, number, number] = [minX, canvasHeight - maxY, maxX, canvasHeight - minY]

        // 构建综合存储对象
        return {
            annotationType: this.currentAnnotation.pdfjsType,
            color: getRGB(this.currentAnnotation.style.color),
            opacity: this.currentAnnotation.style.opacity,
            quadPoints: quadPoints,
            outlines: outlines,
            rect: rect,
            pageIndex: this.pageNumber - 1,
            rotation: 0
        }
    }

    /**
     * 处理鼠标按下事件，目前未实现具体逻辑。
     */
    protected mouseDownHandler() {}

    /**
     * 处理鼠标移动事件，目前未实现具体逻辑。
     */
    protected mouseMoveHandler() {}

    /**
     * 处理鼠标抬起事件，目前未实现具体逻辑。
     */
    protected mouseUpHandler() {}

    /**
     * 处理鼠标移出事件，目前未实现具体逻辑。
     */
    protected mouseOutHandler() {}

    /**
     * 处理鼠标移入事件，目前未实现具体逻辑。
     */
    protected mouseEnterHandler() {}
}
