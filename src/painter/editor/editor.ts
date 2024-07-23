import Konva from 'konva'
import { AnnotationType, IAnnotationContent, IAnnotationStore, IAnnotationType, IPdfjsAnnotationStorage } from '../../const/definitions'
import { KonvaEventObject } from 'konva/lib/Node'
import { generateUUID } from '../../utils/utils'
import { SHAPE_GROUP_NAME } from '../const'
import { PDFViewerApplication } from 'pdfjs'

/**
 * IEditorOptions 接口定义了编辑器的初始化选项。
 */
export interface IEditorOptions {
    pdfViewerApplication: PDFViewerApplication
    konvaStage: Konva.Stage // Konva Stage对象
    pageNumber: number // 页面编号
    annotation: IAnnotationType | null // 当前注解对象，可以为 null
    /**
     * 添加形状组的回调函数。
     * @param shapeGroup 添加的形状组对象
     * @param pdfjsAnnotationStorage PDF.js 注解存储对象
     * @param annotationContent 注解内容，可选
     */
    onAdd: (shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) => void
}

/**
 * IShapeGroup 接口定义了形状组的基本结构。
 */
export interface IShapeGroup {
    id: string // 形状组的唯一标识符
    konvaGroup: Konva.Group // Konva.Group 对象
    isDone: boolean // 标识形状组是否已完成
    pageNumber: number // 所属页面的页码
    annotation: IAnnotationType // 关联的注解对象
}

/**
 * Editor 是一个抽象类，定义了编辑器的基本行为和属性。
 */
export abstract class Editor {
    protected pdfViewerApplication: PDFViewerApplication
    public readonly id: string // 编辑器实例的唯一标识符
    public readonly onAdd: (shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) => void // 添加形状组的回调函数
    protected konvaStage: Konva.Stage // Konva Stage对象
    protected readonly pageNumber: number // 页面编号
    protected currentAnnotation: IAnnotationType | null // 当前注解对象，可以为 null
    protected isPainting: boolean // 是否正在绘制标志位
    public shapeGroupStore: Map<string, IShapeGroup> = new Map() // 存储形状组的 Map
    public currentShapeGroup: IShapeGroup | null // 当前操作的形状组，可以为 null

    static MinSize = 8 // 最小尺寸常量

    /**
     * Editor 类的构造函数。
     * @param options 初始化编辑器的选项
     */
    constructor({ konvaStage, pageNumber, annotation, onAdd, editorType, pdfViewerApplication }: IEditorOptions & { editorType: AnnotationType }) {
        this.pdfViewerApplication = pdfViewerApplication
        this.id = `${pageNumber}_${editorType}` // 构造唯一标识符
        this.konvaStage = konvaStage // 初始化 Konva Stage对象
        this.pageNumber = pageNumber // 初始化页面编号
        this.currentAnnotation = annotation // 初始化当前注解对象
        this.isPainting = false // 初始化绘制状态为 false
        this.currentShapeGroup = null // 初始化当前形状组为 null
        this.onAdd = onAdd // 初始化添加形状组的回调函数
        this.disableEditMode() // 禁用编辑模式
        this.enableEditMode() // 启用编辑模式
    }

    /**
     * 发送添加事件的私有方法，调用 onAdd 回调函数。
     * @param pdfjsAnnotationStorage PDF.js 注解存储对象
     * @param annotationContent 注解内容，可选
     */
    private dispatchAddEvent(pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        this.onAdd(this.currentShapeGroup, pdfjsAnnotationStorage, annotationContent) // 调用 onAdd 回调函数
    }

    /**
     * 启用编辑模式，监听 Konva Stage的鼠标事件。
     */
    protected enableEditMode() {
        this.konvaStage.on('mousedown', e => {
            if (e.evt.button === 0) {
                this.mouseDownHandler(e) // 处理鼠标按下事件
            }
        })
        this.konvaStage.on('mousemove', e => {
            this.mouseMoveHandler(e) // 处理鼠标移动事件
        })
        this.konvaStage.on('mouseup', e => {
            if (e.evt.button === 0) {
                this.mouseUpHandler(e) // 处理鼠标松开事件
            }
        })
        this.konvaStage.on('mouseenter', e => {
            if (e.evt.button === 0) {
                this.mouseEnterHandler(e) // 处理鼠标进入事件
            }
        })
        this.konvaStage.on('mouseout', e => {
            this.mouseOutHandler(e) // 处理鼠标离开事件
        })
    }

    /**
     * 禁用编辑模式，取消 Konva Stage的鼠标事件监听。
     */
    protected disableEditMode() {
        this.isPainting = false // 设置绘制状态为 false
        this.konvaStage.off('click')
        this.konvaStage.off('mousedown')
        this.konvaStage.off('mousemove')
        this.konvaStage.off('mouseup')
        this.konvaStage.off('mouseenter')
        this.konvaStage.off('mouseout')
    }

    /**
     * 获取背景图层，如果传入了 konvaStage 则使用传入的Stage，否则使用类中的Stage。
     * @param konvaStage 可选参数，传入的 Konva Stage对象
     * @returns 返回第一个图层作为背景图层
     * @protected
     */
    protected getBgLayer(konvaStage?: Konva.Stage): Konva.Layer {
        return konvaStage ? konvaStage.getLayers()[0] : this.konvaStage.getLayers()[0]
    }

    /**
     * 删除指定 ID 的形状组，并在Stage上销毁对应的 Konva.Group 对象。
     * @param id 要删除的形状组的 ID
     * @protected
     */
    protected delShapeGroup(id: string) {
        this.shapeGroupStore.delete(id) // 从 shapeGroupStore 中删除指定 ID 的形状组
        const group = this.konvaStage.findOne(node => node.getType() === 'Group' && node.id() === id) // 查找对应 ID 的 Konva.Group 对象
        if (group) {
            group.destroy() // 销毁 Konva.Group 对象
        }
    }

    /**
     * 设置指定 ID 的形状组为已完成状态，并触发添加事件。
     * @param id 要设置为已完成的形状组的 ID
     * @param pdfjsAnnotationStorage PDF.js 注解存储对象
     * @param annotationContent 注解内容，可选
     * @protected
     */
    protected setShapeGroupDone(id: string, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        const shapeGroup = this.shapeGroupStore.get(id) // 获取指定 ID 的形状组对象
        if (shapeGroup) {
            shapeGroup.isDone = true // 设置形状组为已完成状态
            this.dispatchAddEvent(pdfjsAnnotationStorage, annotationContent) // 触发添加事件
        }
    }

    /**
     * 获取当前形状组中指定类型的子节点。
     * @param className Konva 形状的类名，例如 'Rect'
     * @returns 返回符合指定类名的节点数组
     * @protected
     */
    protected getNodesByClassName<T extends Konva.Node>(className: string): T[] {
        const children = this.currentShapeGroup.konvaGroup.getChildren((node: Konva.Node) => node.getClassName() === className) // 获取当前形状组中指定类名的子节点
        return children as unknown as T[] // 返回子节点数组
    }

    /**
     * 获取指定 Konva.Group 中指定类型的子节点。
     * @param group 指定的 Konva.Group 对象
     * @param className Konva 形状的类名，例如 'Rect'
     * @returns 返回符合指定类名的节点数组
     * @protected
     */
    protected getGroupNodesByClassName<T extends Konva.Node>(group: Konva.Group, className: string): T[] {
        const children = group.getChildren((node: Konva.Node) => node.getClassName() === className) // 获取指定 Konva.Group 中指定类名的子节点
        return children as unknown as T[] // 返回子节点数组
    }

    /**
     * 更新 shapeGroupStore 中指定 ID 的 Konva.Group 对象。
     * @param id 需要更新的形状组的 ID
     * @param newKonvaGroup 用于更新的新 Konva.Group 对象
     * @returns 返回更新后的形状组对象，如果未找到对应 ID 的形状组则返回 null
     * @protected
     */
    protected updateKonvaGroup(id: string, newKonvaGroup: Konva.Group): IShapeGroup | null {
        if (this.shapeGroupStore.has(id)) {
            // 检查 shapeGroupStore 中是否存在指定 ID 的形状组
            const shapeGroup = this.shapeGroupStore.get(id) // 获取当前形状组
            if (shapeGroup) {
                shapeGroup.konvaGroup = newKonvaGroup // 更新 Konva.Group 对象
                this.shapeGroupStore.set(id, shapeGroup) // 更新存储中的形状组对象
                return shapeGroup // 返回更新后的形状组对象
            }
        } else {
            console.warn(`ShapeGroup with id ${id} not found.`) // 输出警告信息，指定 ID 的形状组未找到
        }
        return null // 如果未找到形状组，则返回 null
    }

    /**
     * 创建一个新的形状组，并添加到 shapeGroupStore 中。
     * @returns 返回新创建的形状组对象
     * @protected
     */
    protected createShapeGroup(): IShapeGroup {
        const id = generateUUID() // 生成新的唯一标识符
        const group = new Konva.Group({
            // 创建新的 Konva.Group 对象
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id
        })
        const shapeGroup: IShapeGroup = {
            // 创建形状组对象
            id,
            konvaGroup: group,
            pageNumber: this.pageNumber,
            annotation: this.currentAnnotation,
            isDone: false
        }
        this.shapeGroupStore.set(id, shapeGroup) // 将形状组对象添加到 shapeGroupStore 中
        return shapeGroup // 返回新创建的形状组对象
    }

    /**
     * 刷新 PDF.js 注解存储，更新指定形状组的内容。
     * @param groupId 形状组的 ID
     * @param groupString 形状组的字符串表示
     * @param rawAnnotationStore 原始注解存储对象
     * @returns 返回更新后的 PDF.js 注解存储对象的 Promise
     */
    public abstract refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore): Promise<{annotationStorage :IPdfjsAnnotationStorage, batchPdfjsAnnotationStorage?: IPdfjsAnnotationStorage[]}>

    /**
     * 处理鼠标按下事件的抽象方法，子类需实现具体逻辑。
     * @param e Konva 事件对象
     * @protected
     */
    protected abstract mouseDownHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标移动事件的抽象方法，子类需实现具体逻辑。
     * @param e Konva 事件对象
     * @protected
     */
    protected abstract mouseMoveHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标松开事件的抽象方法，子类需实现具体逻辑。
     * @param e Konva 事件对象
     * @protected
     */
    protected abstract mouseUpHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标离开事件的抽象方法，子类需实现具体逻辑。
     * @param e Konva 事件对象
     * @protected
     */
    protected abstract mouseOutHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标进入事件的抽象方法，子类需实现具体逻辑。
     * @param e Konva 事件对象
     * @protected
     */
    protected abstract mouseEnterHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 激活编辑器，重新设置 Konva Stage和当前注解对象，并启用编辑模式。
     * @param konvaStage 新的 Konva Stage对象
     * @param annotation 新的注解对象
     */
    public activate(konvaStage: Konva.Stage, annotation: IAnnotationType) {
        this.konvaStage = konvaStage // 更新 Konva Stage对象
        this.currentAnnotation = annotation // 更新当前注解对象
        this.isPainting = false // 重置绘制状态
        this.disableEditMode() // 禁用编辑模式
        this.enableEditMode() // 启用编辑模式
    }

    /**
     * 将序列化的 Konva.Group 添加到图层。
     * @param konvaStage Konva Stage对象
     * @param konvaString 序列化的 Konva.Group 字符串表示
     */
    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString) // 根据序列化字符串创建 Konva.Group 对象
        this.getBgLayer(konvaStage).add(ghostGroup) // 将 Konva.Group 对象添加到背景图层
    }

    /**
     * 删除指定 ID 的形状组。
     * @param id 要删除的形状组的 ID
     */
    public deleteGroup(id: string, konvaStage: Konva.Stage) {
        this.konvaStage = konvaStage
        this.delShapeGroup(id) // 调用 delShapeGroup 方法删除指定 ID 的形状组
    }

    /**
     * 静态属性，存储所有的 Timer 实例。
     */
    static Timer: { [pageNumber: number]: number } = {}

    /**
     * 静态方法，清除指定页面的定时器。
     * @param pageNumber 页面编号
     */
    static TimerClear(pageNumber: number) {
        const timer = Editor.Timer[pageNumber] // 获取指定页面的定时器
        if (timer) {
            window.clearTimeout(timer) // 清除定时器
        }
    }

    /**
     * 静态方法，启动指定页面的定时器。
     * @param pageNumber 页面编号
     * @param callback 定时器回调函数，接受页面编号作为参数
     */
    static TimerStart(pageNumber: number, callback: (pageNumber: number) => void) {
        Editor.Timer[pageNumber] = window.setTimeout(() => {
            // 设置定时器
            if (typeof callback === 'function') {
                callback(pageNumber) // 执行定时器回调函数
            }
        }, 1000)
    }
}
