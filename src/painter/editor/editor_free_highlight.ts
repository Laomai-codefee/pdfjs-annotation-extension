import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { IEditorOptions, Editor } from './editor'
import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'

export class EditorFreeHighlight extends Editor {
    private line: Konva.Line | null // 当前正在绘制的自由曲线

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.FREE_HIGHLIGHT })
        this.line = null // 初始化当前曲线为 null
    }
    /**
     * 处理鼠标或触摸指针按下事件，开始绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<PointerEvent>): void {
        if (e.currentTarget !== this.konvaStage) {
            return
        }

        this.line = null // 重置当前曲线对象
        this.isPainting = true

        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const pos = this.konvaStage.getRelativePointerPosition()

        this.line = new Konva.Line({
            stroke: this.currentAnnotation.style.color,
            strokeWidth: this.currentAnnotation.style.strokeWidth,
            opacity: this.currentAnnotation.style.opacity,
            hitStrokeWidth: this.currentAnnotation.style.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            visible: false,
            globalCompositeOperation: 'source-over',
            points: [pos.x, pos.y] // 初始化起始点
        })

        this.currentShapeGroup.konvaGroup.add(this.line) // 将曲线添加到当前形状组中
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标释放事件监听器
    }

    /**
     * 处理鼠标或触摸指针移动事件，绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<PointerEvent>): void {
        if (!this.isPainting) {
            return
        }
        e.evt.preventDefault() // 阻止默认事件，如滚动页面
        this.line.show() // 显示当前绘制的曲线
        const pos = this.konvaStage.getRelativePointerPosition()
        const newPoints = this.line.points().concat([pos.x, pos.y])
        this.line.points(newPoints) // 更新曲线的点集
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成自由曲线的绘制。
     */
    protected mouseUpHandler(): void {
        if (!this.isPainting) {
            return
        }

        this.isPainting = false // 结束绘制状态

        // 获取曲线的父节点组
        const group = this.line?.getParent()
        if (group && !this.line.isVisible() && group.getType() === 'Group') {
            this.delShapeGroup(group.id())
            return
        }

        if (this.isTooSmall()) {
            this.line?.destroy()
            if (group) {
                this.delShapeGroup(group.id())
            }
            this.line = null
            return
        }

        if (this.line) {
            const originalPoints = this.line.points()
            const correctedPoints = this.correctLineIfStraight(originalPoints)
            this.line.points(correctedPoints) // 更新线条点集为修正后的点集
            this.setShapeGroupDone(
                group.id(),
                this.calculateLinesForStorage({
                    line: this.line,
                    group: this.currentShapeGroup.konvaGroup,
                    annotationType: this.currentAnnotation.pdfjsType,
                    color: getRGB(this.currentAnnotation.style.color),
                    thickness: this.currentAnnotation.style.strokeWidth || 2,
                    opacity: this.currentAnnotation.style.opacity,
                    pageIndex: this.pageNumber - 1
                })
            )
            this.line = null
        }
    }

    /**
     * 全局鼠标释放事件处理器，仅处理左键释放事件。
     * @param e MouseEvent 对象
     */
    private globalPointerUpHandler = (e: MouseEvent): void => {
        if (e.button !== 0) return // 只处理左键释放事件
        this.mouseUpHandler() // 调用指针释放处理方法
        window.removeEventListener('mouseup', this.globalPointerUpHandler) // 移除全局鼠标释放事件监听器
    }

    public async refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore) {
        const ghostGroup = Konva.Node.create(groupString)
        const line = this.getGroupNodesByClassName(ghostGroup, 'Line')[0] as Konva.Line
        return this.calculateLinesForStorage({
            group: ghostGroup,
            line,
            annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
            color: rawAnnotationStore.pdfjsAnnotationStorage.color,
            thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
            opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
            pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
        })
    }

    /**
     * 修正接近水平或垂直的线条，使其成为完全水平或垂直的直线。
     * @param points 曲线的点集
     * @returns 修正后的点集
     */
    private correctLineIfStraight(points: number[]): number[] {
        // 阈值，用于判断线段接近水平或垂直
        const THRESHOLD_ANGLE_DEGREES = 2

        // 获取起始和结束点的坐标
        const startX = points[0]
        const startY = points[1]
        const endX = points[points.length - 2]
        const endY = points[points.length - 1]

        const deltaX = endX - startX
        const deltaY = endY - startY

        // 计算线段的角度
        const angleRad = Math.atan2(deltaY, deltaX)
        const angleDeg = Math.abs(angleRad * (180 / Math.PI))

        // 判断线段是否接近水平或垂直
        const isCloseToHorizontal = angleDeg <= THRESHOLD_ANGLE_DEGREES || angleDeg >= 180 - THRESHOLD_ANGLE_DEGREES
        const isCloseToVertical = Math.abs(angleDeg - 90) <= THRESHOLD_ANGLE_DEGREES

        if (isCloseToHorizontal) {
            // 修正为水平线
            return points.map((value, index) => (index % 2 === 0 ? value : startY))
        } else if (isCloseToVertical) {
            // 修正为垂直线
            return points.map((value, index) => (index % 2 === 0 ? startX : value))
        }

        // 返回原始点集
        return points
    }

    private fixLineCoordinateForGroup(line: Konva.Line, group: Konva.Group) {
        // 获取组的全局变换矩阵
        const groupTransform = group.getTransform()

        // 获取线条的局部点集
        const points = line.points()
        const transformedPoints: number[] = []

        // 遍历点集并应用组的变换
        for (let i = 0; i < points.length; i += 2) {
            const localX = points[i]
            const localY = points[i + 1]

            // 应用组的变换，将局部坐标转换为全局坐标
            const globalPos = groupTransform.point({ x: localX, y: localY })

            transformedPoints.push(globalPos.x, globalPos.y)
        }

        return transformedPoints
    }

    /**
     * 将当前绘制的曲线数据转换为 PDF.js 所需的注释存储数据格式。
     * @returns 符合 PDF.js 注释存储数据格式的对象
     */
    private calculateLinesForStorage({
        group,
        line,
        annotationType,
        color,
        thickness,
        opacity,
        pageIndex
    }: {
        group: Konva.Group
        line: Konva.Line
        annotationType: PdfjsAnnotationEditorType
        color: any
        thickness: number
        opacity: number
        pageIndex: number
    }): IPdfjsAnnotationStorage {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y

        // 初始化边界框变量
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity

        const path: Array<{ bezier: number[]; points: number[] }> = []

        // 获取原始点集
        const originalPoints = this.fixLineCoordinateForGroup(line, group) || []

        // 获取当前线条的宽度
        const strokeWidth = thickness
        const halfStrokeWidth = strokeWidth / 2

        // 转换点集并计算边界框
        const transformedPoints = originalPoints.map((coord, index) => {
            if (index % 2 !== 0) {
                // Y 坐标
                const transformedY = canvasHeight - coord
                // 考虑到笔触宽度的边界框计算
                minY = Math.min(minY, transformedY - halfStrokeWidth)
                maxY = Math.max(maxY, transformedY + halfStrokeWidth)
                return transformedY
            } else {
                // X 坐标
                // 考虑到笔触宽度的边界框计算
                minX = Math.min(minX, coord - halfStrokeWidth)
                maxX = Math.max(maxX, coord + halfStrokeWidth)
                return coord
            }
        })

        // 添加转换后的点集到路径
        path.push({
            bezier: this.generateBezierPoints(transformedPoints),
            points: transformedPoints
        })

        // 构建边界框数组
        const rect: [number, number, number, number] = [minX, minY, maxX, maxY]

        // 返回符合 PDF.js 注释存储数据格式的对象
        return {
            annotationType,
            color,
            thickness: strokeWidth,
            opacity,
            paths: path,
            pageIndex,
            rect: rect,
            rotation: 0
        }
    }

    /**
     * 生成贝塞尔曲线点集（当前为占位符，仅返回原始点集）。
     * @param path 原始点集
     * @returns 生成的贝塞尔曲线点集
     */
    private generateBezierPoints(path: number[]): number[] {
        // 当前实现仅返回原始点集
        return path
    }

    /**
     * 判断当前绘制的曲线是否太小。
     * @returns 如果曲线点集长度小于 5 返回 true，否则返回 false
     */
    private isTooSmall(): boolean {
        return (this.line?.points().length || 0) < 5
    }

    protected mouseOutHandler() {}
    protected mouseEnterHandler() {}
}
