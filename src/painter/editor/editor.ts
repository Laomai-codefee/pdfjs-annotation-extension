import Konva from 'konva'
import { AnnotationType, IAnnotationContent, IAnnotationStore, IAnnotationType, IPdfjsAnnotationStorage } from '../../types/definitions'
import { KonvaEventObject } from 'konva/lib/Node'
import { generateUUID } from '../../utils/utils'
import { SHAPE_GROUP_NAME } from '../const'

export interface IEditorOptions {
    konvaStage: Konva.Stage
    pageNumber: number
    annotation: IAnnotationType | null
    onAdd: (shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) => void
}

export interface IShapeGroup {
    id: string
    konvaGroup: Konva.Group
    isDone: boolean
    pageNumber: number
    annotation: IAnnotationType
}

export abstract class Editor {
    public readonly id: string
    public readonly onAdd: (shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) => void
    protected konvaStage: Konva.Stage
    protected readonly pageNumber: number
    protected currentAnnotation: IAnnotationType | null
    protected isPainting: boolean
    public shapeGroupStore: Map<string, IShapeGroup> = new Map()
    public currentShapeGroup: IShapeGroup | null

    static MinSize = 8

    /**
     * Editor 类的构造函数
     * @param options {IEditorOptions} 初始化工具的选项
     */
    constructor({ konvaStage, pageNumber, annotation, onAdd, editorType }: IEditorOptions & { editorType: AnnotationType }) {
        this.id = `${pageNumber}_${editorType}`
        this.konvaStage = konvaStage
        this.pageNumber = pageNumber
        this.currentAnnotation = annotation
        this.isPainting = false
        this.currentShapeGroup = null
        this.onAdd = onAdd
        this.disableEditMode()
        this.enableEditMode()
    }

    private dispatchAddEvent(pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        this.onAdd(this.currentShapeGroup, pdfjsAnnotationStorage, annotationContent)
    }

    protected enableEditMode() {
        this.konvaStage.on('mousedown', e => {
            if (e.evt.button === 0) {
                this.mouseDownHandler(e)
            }
        })
        this.konvaStage.on('mousemove', e => {
            this.mouseMoveHandler(e)
        })
        this.konvaStage.on('mouseup', e => {
            if (e.evt.button === 0) {
                this.mouseUpHandler(e)
            }
        })
        this.konvaStage.on('mouseenter', e => {
            if (e.evt.button === 0) {
                this.mouseEnterHandler(e)
            }
        })
        this.konvaStage.on('mouseout', e => {
            this.mouseOutHandler(e)
        })
    }

    protected disableEditMode() {
        this.isPainting = false
        this.konvaStage.off('click')
        this.konvaStage.off('mousedown')
        this.konvaStage.off('mousemove')
        this.konvaStage.off('mouseup')
        this.konvaStage.off('mouseenter')
        this.konvaStage.off('mouseout')
    }

    /**
     * 获取背景图层
     * @returns {Konva.Layer} 背景图层
     * @protected
     */
    protected getBgLayer(konvaStage?: Konva.Stage): Konva.Layer {
        return konvaStage ? konvaStage.getLayers()[0] : this.konvaStage.getLayers()[0]
    }

    /**
     * 删除指定的形状组
     * @param id {string} 形状组的 ID
     * @protected
     */
    protected delShapeGroup(id: string) {
        this.shapeGroupStore.delete(id)
        const group = this.konvaStage.findOne(node => node.getType() === 'Group' && node.id() === id)
        if (group) {
            group.destroy()
        }
    }

    /**
     * 设置指定的形状组为已完成
     * @param id {string} 形状组的 ID
     * @protected
     */
    protected setShapeGroupDone(id: string, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        const shapeGroup = this.shapeGroupStore.get(id)
        if (shapeGroup) {
            shapeGroup.isDone = true
            this.dispatchAddEvent(pdfjsAnnotationStorage, annotationContent)
        }
    }

    /**
     * @description 获取当前组中所有指定类型的子节点
     * @param className Konva 形状的类名，例如 'Rect'
     * @returns T[] 符合指定类名的节点数组
     */
    protected getNodesByClassName<T extends Konva.Node>(className: string): T[] {
        const children = this.currentShapeGroup.konvaGroup.getChildren((node: Konva.Node) => node.getClassName() === className)
        return children as unknown as T[]
    }

    protected getGroupNodesByClassName<T extends Konva.Node>(group: Konva.Group, className: string): T[] {
        const children = group.getChildren((node: Konva.Node) => node.getClassName() === className)
        return children as unknown as T[]
    }

    /**
     * 更新 shapeGroupStore 中的 konvaGroup
     * @param id - 需要更新的 shapeGroup 的 ID
     * @param newKonvaGroup - 用于更新的新的 Konva.Group 对象
     * @returns 更新后的 IShapeGroup 对象或 null 如果没有找到对应的 shapeGroup
     */
    protected updateKonvaGroup(id: string, newKonvaGroup: Konva.Group): IShapeGroup | null {
        // 检查是否存在该 shapeGroup
        if (this.shapeGroupStore.has(id)) {
            // 获取当前的 shapeGroup
            const shapeGroup = this.shapeGroupStore.get(id)
            if (shapeGroup) {
                // 更新 konvaGroup
                shapeGroup.konvaGroup = newKonvaGroup
                // 更新存储
                this.shapeGroupStore.set(id, shapeGroup)
                // 返回更新后的 shapeGroup
                return shapeGroup
            }
        } else {
            console.warn(`ShapeGroup with id ${id} not found.`)
        }
        return null // 如果没有找到 shapeGroup，返回 null
    }

    /**
     * 创建一个新的形状组
     * @returns {IShapeGroup} 新的形状组
     * @protected
     */
    protected createShapeGroup(): IShapeGroup {
        const id = generateUUID()
        const group = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id
        })
        const shapeGroup: IShapeGroup = {
            id,
            konvaGroup: group,
            pageNumber: this.pageNumber,
            annotation: this.currentAnnotation,
            isDone: false
        }
        this.shapeGroupStore.set(id, shapeGroup)
        return shapeGroup
    }

    public abstract refreshPdfjsAnnotationStorage(groupId: string, groupString: string, rawAnnotationStore: IAnnotationStore): Promise<IPdfjsAnnotationStorage>

    /**
     * 处理鼠标按下事件
     * @param e {KonvaEventObject<mouseEvent>} Konva 事件对象
     * @protected
     */
    protected abstract mouseDownHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标移动事件
     * @param e {KonvaEventObject<mouseEvent>} Konva 事件对象
     * @protected
     */
    protected abstract mouseMoveHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标松开事件
     * @param e {KonvaEventObject<mouseEvent>} Konva 事件对象
     * @protected
     */
    protected abstract mouseUpHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标离开事件
     * @param e {KonvaEventObject<mouseEvent>} Konva 事件对象
     * @protected
     */
    protected abstract mouseOutHandler(e: KonvaEventObject<MouseEvent>): void

    /**
     * 处理鼠标进入事件
     * @param e {KonvaEventObject<mouseEvent>} Konva 事件对象
     * @protected
     */
    protected abstract mouseEnterHandler(e: KonvaEventObject<MouseEvent>): void

    public activate(konvaStage: Konva.Stage, annotation: IAnnotationType) {
        this.konvaStage = konvaStage
        this.currentAnnotation = annotation
        this.isPainting = false
        this.disableEditMode()
        this.enableEditMode()
    }

    public addSerializedGroupToLayer(konvaStage: Konva.Stage, konvaString: string) {
        const ghostGroup = Konva.Node.create(konvaString)
        this.getBgLayer(konvaStage).add(ghostGroup)
    }

    public deleteGroup(id) {
        this.delShapeGroup(id)
    }

    /**
     * @description存储所有的Timer实例
     */
    static Timer: { [pageNumber: number]: number } = {}
    /**
     * @description 清除对应页面定时器
     */
    static TimerClear(pageNumber: number) {
        const timer = Editor.Timer[pageNumber]
        if (timer) {
            window.clearTimeout(timer)
        }
    }
    /**
     * @description 执行对应页面定时器
     */
    static TimerStart(pageNumber: number, callback: (pageNumber) => void) {
        Editor.Timer[pageNumber] = window.setTimeout(() => {
            if (typeof callback === 'function') {
                callback(pageNumber)
            }
        }, 1000)
    }
}
