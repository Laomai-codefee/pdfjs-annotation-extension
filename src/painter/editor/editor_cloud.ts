import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { AnnotationType } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

export class EditorCloud extends Editor {
    private cloudPath: Konva.Path | null = null
    private points: { x: number; y: number }[] = []
    private startRect: Konva.Rect | null = null
    private readonly startRectSize = 12

    constructor(options: IEditorOptions) {
        super({ ...options, editorType: AnnotationType.CLOUD })
        this.konvaStage.on('dblclick', this.handleDoubleClick)
        window.addEventListener('keyup', this.handleKeyUp)
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && this.isPainting) {
            this.cancelDrawing()
        }
    }

    private cancelDrawing() {
        this.isPainting = false
        this.points = []

        if (this.cloudPath) {
            this.cloudPath.destroy()
            this.cloudPath = null
        }

        if (this.startRect) {
            this.startRect.destroy()
            this.startRect = null
        }

        if (this.currentShapeGroup) {
            this.delShapeGroup(this.currentShapeGroup.konvaGroup.id())
            this.currentShapeGroup = null
        }

        this.getBgLayer().batchDraw()
    }

    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        const pos = this.konvaStage.getRelativePointerPosition()
        this.points.push(pos)

        if (!this.isPainting) {
            this.isPainting = true
            this.currentShapeGroup = this.createShapeGroup()
            this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

            this.cloudPath = new Konva.Path({
                data: '',
                stroke: this.currentAnnotation.style.color,
                strokeWidth: this.currentAnnotation.style.strokeWidth,
                fillEnabled: false,
                lineJoin: 'round',
                lineCap: 'round',
                hitStrokeWidth: 20, // 设置点击检测的宽度
                opacity: this.currentAnnotation.style.opacity
            })

            this.currentShapeGroup.konvaGroup.add(this.cloudPath)

            // 添加起点提示矩形
            this.drawStartRect(pos)
        }

        this.updateCloudPreview()
    }

    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting || !this.cloudPath) return
        const pos = this.konvaStage.getRelativePointerPosition()
        this.updateCloudPreview(pos)
    }

    protected mouseUpHandler(e?: KonvaEventObject<MouseEvent | TouchEvent>) {
        // 空实现以符合抽象基类要求
    }

    /**
     * @description 处理双击事件，完成云朵绘制
     * @returns
     */
    private handleDoubleClick = () => {
        if (!this.isPainting || this.points.length < 3) return
        this.isPainting = false

        if (!this.cloudPath) return

        const closedPoints = [...this.points, this.points[0]]
        const pathData = this.generateCloudPathData(closedPoints)
        this.cloudPath.data(pathData)

        this.setShapeGroupDone({
            id: this.currentShapeGroup.konvaGroup.id(),
            color: this.currentAnnotation.style.color,
            contentsObj: { text: '' }
        })

        // 清理状态
        this.cloudPath = null
        this.points = []

        if (this.startRect) {
            this.startRect.destroy()
            this.startRect = null
        }
    }

    /**
     * @description 更新云朵预览路径
     * @param cursorPos
     * @returns
     */
    private updateCloudPreview(cursorPos?: { x: number; y: number }) {
        if (!this.cloudPath) return

        const pathPoints = [...this.points]
        if (cursorPos) pathPoints.push(cursorPos)

        const pathData = this.generateCloudPathData(pathPoints)
        this.cloudPath.data(pathData)
    }

    /**
     * @description 生成云朵路径数据
     * @param points
     * @returns
     */
    private generateCloudPathData(points: { x: number; y: number }[]): string {
        if (points.length < 2) return ''
        const radius = 12 // 波浪的半径
        const waveStep = radius * 1.1 // 波浪的步长，控制波浪的密度
        const center = this.computeCentroid(points)

        let path = ''
        let fixedAngle: number | null = null
        // 遍历每一段线段，生成波浪路径
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i]
            const p2 = points[i + 1]
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y
            const length = Math.hypot(dx, dy)

            let angle = Math.atan2(dy, dx)
            if (i === 0 && !fixedAngle) fixedAngle = angle
            if (i === 0) angle = fixedAngle!

            const normalX = Math.cos(angle + Math.PI / 2)
            const normalY = Math.sin(angle + Math.PI / 2)

            const segmentMidX = (p1.x + p2.x) / 2
            const segmentMidY = (p1.y + p2.y) / 2
            const toCenterX = center.x - segmentMidX
            const toCenterY = center.y - segmentMidY
            let normalSign = 1
            if (normalX * toCenterX + normalY * toCenterY > 0) normalSign = -1

            const steps = Math.max(2, Math.floor(length / waveStep))

            for (let j = 0; j < steps; j++) {
                const t1 = j / steps
                const t2 = (j + 1) / steps

                const x1 = p1.x + dx * t1
                const y1 = p1.y + dy * t1
                const x2 = p1.x + dx * t2
                const y2 = p1.y + dy * t2

                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const controlX = midX + normalX * radius * normalSign
                const controlY = midY + normalY * radius * normalSign

                if (i === 0 && j === 0) {
                    path += `M ${x1} ${y1} `
                }

                path += `Q ${controlX} ${controlY} ${x2} ${y2} `
            }
        }

        return path
    }

    /**
     * @description 计算一组点的质心
     * @param points 点数组
     * @returns 质心坐标
     */
    private computeCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
        const sum = points.reduce(
            (acc, p) => {
                acc.x += p.x
                acc.y += p.y
                return acc
            },
            { x: 0, y: 0 }
        )
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        }
    }

    /**
     * @description 绘制起点提示矩形
     * @param pos 起点位置
     */
    private drawStartRect(pos: { x: number; y: number }) {
        this.startRect = new Konva.Rect({
            x: pos.x - this.startRectSize / 2,
            y: pos.y - this.startRectSize / 2,
            width: this.startRectSize,
            height: this.startRectSize,
            stroke: '#999',
            strokeWidth: 1,
            fill: null,
            cornerRadius: 2,
            hitStrokeWidth: 10, // 增加点击检测区域
            draggable: false,
            dash: [4, 2],
            name: 'startRect'
        })

        this.getBgLayer().add(this.startRect)
        this.startRect.moveToTop()
        this.startRect.on('mouseup', (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
            this.handleDoubleClick()
        })
        this.startRect.on('mousemove', (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
            this.startRect.stroke('#000')
            this.startRect.getLayer()?.batchDraw()
        })
        this.startRect.on('mouseout', (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
            this.startRect.stroke('#999')
            this.startRect.getLayer()?.batchDraw()
        })
    }
}
