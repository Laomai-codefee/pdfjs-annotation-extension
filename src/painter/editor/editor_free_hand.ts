import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { getRGB } from '../../utils/utils'
import { Editor, IEditorOptions } from './editor'

/**
 * 自由手绘编辑器类，继承自基础编辑器类 Editor，用于在画布上绘制自由曲线。
 */
export class EditorFreeHand extends Editor {
    private line: Konva.Line | null // 当前正在绘制的自由曲线

    /**
     * 构造函数，初始化自由手绘编辑器。
     * @param EditorOptions 编辑器选项接口
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.FREEHAND })
        this.line = null // 初始化当前曲线为null
    }

    /**
     * 处理鼠标或触摸指针按下事件，开始绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (e.currentTarget !== this.konvaStage) {
            return
        }

        Editor.TimerClear(this.pageNumber) // 清除当前页的计时器
        this.line = null // 重置当前曲线对象
        this.isPainting = true // 设置绘制状态为真

        if (!this.currentShapeGroup) {
            // 如果当前形状组不存在，则创建新的形状组并添加到背景层
            this.currentShapeGroup = this.createShapeGroup()
            this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        }

        // 获取当前指针位置，并初始化线条对象
        const pos = this.konvaStage.getRelativePointerPosition()
        this.line = new Konva.Line({
            // do not scale strokes
            strokeScaleEnabled: false,
            stroke: this.currentAnnotation.style.color, // 设置线条颜色
            strokeWidth: this.currentAnnotation.style.strokeWidth, // 设置线条宽度
            opacity: this.currentAnnotation.style.opacity, // 设置线条透明度
            lineCap: 'round', // 设置线条端点为圆形
            lineJoin: 'round', // 设置线条连接处为圆形
            hitStrokeWidth: 20, // 设置点击检测的宽度
            visible: false, // 初始化为不可见
            globalCompositeOperation: 'source-over',
            points: [pos.x, pos.y, pos.x, pos.y] // 初始化起始点
        })

        this.currentShapeGroup.konvaGroup.add(this.line) // 将曲线添加到当前形状组中
        window.addEventListener('mouseup', this.globalPointerUpHandler) // 添加全局鼠标释放事件监听器
    }

    /**
     * 处理鼠标或触摸指针移动事件，绘制自由曲线。
     * @param e Konva 事件对象
     */
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isPainting) {
            return
        }

        e.evt.preventDefault() // 阻止默认事件，如滚动页面
        this.line.show() // 显示当前绘制的曲线

        // 获取当前指针位置并更新线条点集
        const pos = this.konvaStage.getRelativePointerPosition()
        const newPoints = this.line.points().concat([pos.x, pos.y])
        this.line.points(newPoints)
    }

    /**
     * 处理鼠标或触摸指针释放事件，完成自由曲线的绘制。
     */
    protected mouseUpHandler() {
        if (!this.isPainting) {
            return
        }

        this.isPainting = false // 结束绘制状态
        const group = this.line.getParent() // 获取曲线所在的父组

        if (this.isTooSmall()) {
            // 如果曲线太小，则销毁曲线对象并延时保存形状组状态
            this.line.destroy()
            Editor.TimerStart(this.pageNumber, () => {
                this.setShapeGroupDone(
                    {
                        id: group.id(),
                        color: this.currentAnnotation.style.color
                    }
                    // this.calculateLinesForStorage({
                    //     group: this.currentShapeGroup.konvaGroup,
                    //     annotationType: this.currentAnnotation.pdfjsType,
                    //     color: getRGB(this.currentAnnotation.style.color),
                    //     thickness: this.currentAnnotation.style.strokeWidth || 2,
                    //     opacity: this.currentAnnotation.style.opacity || 1,
                    //     pageIndex: this.pageNumber - 1
                    // })
                )
                this.currentShapeGroup = null
            })
            return
        }

        // 否则，延时保存形状组状态
        Editor.TimerStart(this.pageNumber, () => {
            this.setShapeGroupDone(
                {
                    id: group.id(),
                    color: this.currentAnnotation.style.color
                }
                // this.calculateLinesForStorage({
                //     group: this.currentShapeGroup.konvaGroup,
                //     annotationType: this.currentAnnotation.pdfjsType,
                //     color: getRGB(this.currentAnnotation.style.color),
                //     thickness: this.currentAnnotation.style.strokeWidth || 2,
                //     opacity: this.currentAnnotation.style.opacity || 1,
                //     pageIndex: this.pageNumber - 1
                // })
            )
            this.currentShapeGroup = null
        })

        this.line = null // 重置当前曲线对象为null
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
        // return {
        //     annotationStorage: this.calculateLinesForStorage({
        //         group: ghostGroup,
        //         annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
        //         color: rawAnnotationStore.pdfjsAnnotationStorage.color,
        //         thickness: rawAnnotationStore.pdfjsAnnotationStorage.thickness,
        //         opacity: rawAnnotationStore.pdfjsAnnotationStorage.opacity,
        //         pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex
        //     })
        // }
    }

    /**
     * 修正线条在组内的坐标。
     * @param line Konva.Line 对象
     * @param group Konva.Group 对象
     * @returns 修正后的点集
     */
    private fixLineCoordinateForGroup(line: Konva.Line, group: Konva.Group) {
        const groupTransform = group.getTransform() // 获取组的全局变换矩阵
        const points = line.points() // 获取线条的局部点集
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
     * @param param0 参数对象
     * @returns 符合 PDF.js 注释存储数据格式的对象
     */
    private calculateLinesForStorage({
        group,
        annotationType,
        color,
        thickness,
        opacity,
        pageIndex
    }: {
        group: Konva.Group
        annotationType: PdfjsAnnotationEditorType
        color: number[]
        thickness: number
        opacity: number
        pageIndex: number
    }): IPdfjsAnnotationStorage {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y // 获取画布高度
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity
        const path: Array<{ bezier: number[]; points: number[] }> = []
        const lines = this.getGroupNodesByClassName(group, 'Line') as Konva.Line[] // 获取所有 Line 对象

        lines.forEach(line => {
            const originalPoints = this.fixLineCoordinateForGroup(line, group) // 获取曲线的点集
            const transformedPoints = originalPoints.map((coord, index) => {
                if (index % 2 !== 0) {
                    // 转换 y 坐标到 PDF.js 坐标系
                    const transformedY = canvasHeight - coord
                    // 更新边界框计算
                    minY = Math.min(minY, transformedY)
                    maxY = Math.max(maxY, transformedY)
                    return transformedY
                } else {
                    // x 坐标保持不变，更新边界框计算
                    minX = Math.min(minX, coord)
                    maxX = Math.max(maxX, coord)
                    return coord
                }
            })

            // 将转换后的点集添加到路径数组中
            path.push({
                bezier: transformedPoints,
                points: transformedPoints
            })
        })

        // 构建边界框数组
        const rect: [number, number, number, number] = [minX, minY, maxX, maxY]

        // 返回符合 PDF.js 注释存储数据格式的对象
        return {
            annotationType,
            color,
            thickness,
            opacity,
            paths: path,
            pageIndex,
            rect: rect,
            rotation: 0
        }
    }

    /**
     * 判断当前绘制的曲线是否太小。
     * @returns 如果曲线点集长度小于 5 返回 true，否则返回 false
     */
    private isTooSmall(): boolean {
        return this.line.points().length < Editor.MinSize
    }
}
