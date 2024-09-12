import Konva from 'konva'

import { DefaultChooseSetting, IAnnotationStore } from '../../const/definitions'
import { SELECTOR_HOVER_STYLE, SHAPE_GROUP_NAME } from '../const'
import { KonvaCanvas } from '../index'
import { Modal } from 'antd'

/**
 * 定义选择器的选项接口
 */
export interface ISelectorOptions {
    konvaCanvasStore: Map<number, KonvaCanvas> // 存储各个页面的 Konva 画布实例
    getAnnotationStore: (id: string) => IAnnotationStore // 获取注解存储的方法
    onChange: (id: string, konvaGroupString: string, rawAnnotationStore: IAnnotationStore) => void // 注解变化时的回调
    onDelete: (id: string) => void // 删除注解时的回调
}

/**
 * 定义选择器类
 */
export class Selector {
    public readonly onChange: (id: string, konvaGroupString: string, rawAnnotationStore: IAnnotationStore) => void
    public readonly onDelete: (id: string) => void
    private transformerStore: Map<string, Konva.Transformer> = new Map() // 存储变换器实例
    private getAnnotationStore: (id: string) => IAnnotationStore // 获取注解存储的方法
    private konvaCanvasStore: Map<number, KonvaCanvas> // 存储各个页面的 Konva 画布实例

    private _currentTransformerId: string | null = null // 当前激活的变换器ID

    private selectedId: string | null = null

    // 构造函数，初始化选择器类
    constructor({ konvaCanvasStore, getAnnotationStore, onChange, onDelete }: ISelectorOptions) {
        this.konvaCanvasStore = konvaCanvasStore
        this.getAnnotationStore = getAnnotationStore
        this.onChange = onChange
        this.onDelete = onDelete
    }

    // 获取当前激活的变换器ID
    get currentTransformerId(): string | null {
        return this._currentTransformerId
    }

    // 设置当前激活的变换器ID，并处理变换器状态的更新
    set currentTransformerId(id: string | null) {
        if (this._currentTransformerId !== id) {
            this.selectedId = id
            this.deactivateTransformer(this._currentTransformerId)
            this._currentTransformerId = id
        }
    }

    /**
     * 禁用给定 Konva Stage上的默认事件。
     * @param konvaStage - 要禁用事件的 Konva Stage。
     */
    private disableStageEvents(konvaStage: Konva.Stage): void {
        konvaStage.off('click mousedown mousemove mouseup touchstart touchmove touchend')
    }

    /**
     * 绑定 Konva Stage上的全局点击事件。
     * @param konvaStage - 要绑定事件的 Konva Stage。
     */
    private bindStageEvents(konvaStage: Konva.Stage): void {
        konvaStage.on('click tap', e => {
            if (e.target !== konvaStage) return
            this.clearTransformers()
        })
    }

    /**
     * 获取 Konva Stage的背景图层。
     * @param konvaStage - 要获取背景图层的 Konva Stage。
     * @returns Konva Stage的背景图层。
     */
    private getBackgroundLayer(konvaStage: Konva.Stage): Konva.Layer {
        return konvaStage.getLayers()[0]
    }

    /**
     * 获取给定 Konva Stage上的所有形状组。
     * @param konvaStage - 要获取形状组的 Konva Stage。
     * @returns 形状组的数组。
     */
    private getPageShapeGroups(konvaStage: Konva.Stage): Konva.Group[] {
        return this.getBackgroundLayer(konvaStage).getChildren(node => node.name() === SHAPE_GROUP_NAME) as Konva.Group[]
    }

    // 获取指定 id 的形状组
    private getGroupById(konvaStage: Konva.Stage, groupId: string): Konva.Group | null {
        const pageGroups = this.getPageShapeGroups(konvaStage)
        return pageGroups.find(group => group.id() === groupId) || null
    }

    private getFirstShapeInGroup(group: Konva.Group): Konva.Shape | null {
        return (group.getChildren().find(node => node instanceof Konva.Shape) as Konva.Shape) || null
    }

    /**
     * 启用给定组中的所有形状的交互功能。
     * @param groups - 要启用的形状组。
     * @param konvaStage - 形状组所在的 Konva Stage。
     */
    private enableShapeGroups(groups: Konva.Group[], konvaStage: Konva.Stage): void {
        groups.forEach(group => {
            group.getChildren().forEach(shape => {
                if (shape instanceof Konva.Shape) {
                    this.removeShapeEvents(shape)
                    this.bindShapeEvents(shape, konvaStage)
                }
            })
        })
    }

    /**
     * 禁用给定组中的所有形状的交互功能。
     * @param groups - 要禁用的形状组。
     */
    private disableShapeGroups(groups: Konva.Group[]): void {
        groups.forEach(group => {
            group.getChildren().forEach(shape => {
                if (shape instanceof Konva.Shape) {
                    this.removeShapeEvents(shape)
                }
            })
        })
    }

    /**
     * 为给定形状绑定点击、鼠标悬停和鼠标离开事件。
     * @param shape - 要绑定事件的形状。
     * @param konvaStage - 形状所在的 Konva Stage。
     */
    private bindShapeEvents(shape: Konva.Shape, konvaStage: Konva.Stage): void {

        shape.on('pointerdblclick', () => {
            Modal.confirm({
                title: `是否删除`,
                type: 'warn',
                destroyOnClose: true,
                centered: true,
                okText: '是',
                cancelText: '否',
                onOk: () => {
                    this.onDelete(this.currentTransformerId)
                    this.clearTransformers()
                }
            })
        })

        shape.on('pointerclick', e => {
            if (e.evt.button === 0) {
                this.handleShapeClick(shape, konvaStage)
            }
        })
        shape.on('mouseover', e => {
            if (e.evt.button === 0) {
                this.handleShapeMouseover()
            }
        })
        shape.on('mouseout', e => {
            if (e.evt.button === 0) {
                this.handleShapeMouseout()
            }
        })
    }

    /**
     * 移除给定形状上的所有绑定事件。
     * @param shape - 要移除事件的形状。
     */
    private removeShapeEvents(shape: Konva.Shape): void {
        shape.off('pointerclick mouseover mouseout pointerdblclick')
    }

    /**
     * 处理形状的点击事件。
     * @param shape - 被点击的形状。
     * @param konvaStage - 形状所在的 Konva Stage。
     */
    private handleShapeClick(shape: Konva.Shape, konvaStage: Konva.Stage): void {
        const group = shape.findAncestor(`.${SHAPE_GROUP_NAME}`) as Konva.Group
        if (!group) return
        this.clearTransformers() // 清除之前的变换器
        this.createTransformer(group, konvaStage)
        this.bindGlobalEvents() // 绑定全局事件
    }

    /**
     * 创建变形区域
     * @param group
     * @param konvaStage
     */
    private createTransformer(group: Konva.Group, konvaStage: Konva.Stage) {
        const groupId = group.id()
        this.currentTransformerId = groupId
        const rawAnnotationStore = this.getAnnotationStore(groupId)
        group.off('dragend')
        const transformer = new Konva.Transformer({
            resizeEnabled: !rawAnnotationStore.readonly,
            rotateEnabled: false,
            borderStrokeWidth: DefaultChooseSetting.STROKEWIDTH,
            borderStroke: DefaultChooseSetting.COLOR,
            anchorFill: DefaultChooseSetting.COLOR,
            anchorStroke: DefaultChooseSetting.COLOR,
            anchorCornerRadius: 5,
            anchorStrokeWidth: 2,
            anchorSize: 8,
            padding: 1,
            boundBoxFunc: (oldBox, newBox) => {
                newBox.width = Math.max(30, newBox.width)
                return newBox
            }
        })
        group.draggable(!rawAnnotationStore.readonly)
        transformer.off('transformend')
        transformer.on('transformend', () => {
            this.onChange(group.id(), group.toJSON(), { ...rawAnnotationStore })
        })

        transformer.on('dragend', () => {
            this.onChange(group.id(), group.toJSON(), { ...rawAnnotationStore })
        })

        transformer.nodes([group])
        this.getBackgroundLayer(konvaStage).add(transformer)
        this.transformerStore.set(groupId, transformer)
    }

    /**
     * 根据悬停状态切换光标样式。
     * @param add - 是否添加悬停样式。
     */
    private toggleCursorStyle(add: boolean): void {
        document.body.classList.toggle(SELECTOR_HOVER_STYLE, add)
    }

    /**
     * 处理形状的鼠标悬停事件。
     */
    private handleShapeMouseover(): void {
        this.toggleCursorStyle(true)
    }

    /**
     * 处理形状的鼠标离开事件。
     */
    private handleShapeMouseout(): void {
        this.toggleCursorStyle(false)
    }

    /**
     * 清除所有变换器。
     */
    private clearTransformers(): void {
        this.toggleCursorStyle(false)
        this.removeGlobalEvents()
        this.transformerStore.forEach(transformer => {
            if (transformer) {
                transformer.nodes().forEach(group => {
                    if (group instanceof Konva.Group) {
                        group.draggable(false)
                    }
                })
                transformer.nodes([])
            }
        })
        this.transformerStore.clear()
        this.currentTransformerId = null
    }

    /**
     * 激活指定变换器。
     * @param transformerId - 要激活的变换器ID。
     */
    private activateTransformer(transformerId: string | null): void {
        if (transformerId) {
            const transformer = this.transformerStore.get(transformerId)
            if (transformer) {
                transformer.nodes().forEach(group => {
                    if (group instanceof Konva.Group) {
                        group.draggable(true)
                    }
                })
            }
        }
    }

    /**
     * 停用指定变换器。
     * @param transformerId - 要停用的变换器ID。
     */
    private deactivateTransformer(transformerId: string | null): void {
        if (transformerId) {
            const transformer = this.transformerStore.get(transformerId)
            if (transformer) {
                transformer.nodes().forEach(group => {
                    if (group instanceof Konva.Group) {
                        group.draggable(false)
                    }
                })
            }
        }
    }

    /**
     * 绑定全局事件。
     */
    private bindGlobalEvents(): void {
        window.addEventListener('keyup', this.globalKeyUpHandler)
    }

    /**
     * 移除全局事件。
     */
    private removeGlobalEvents(): void {
        window.removeEventListener('keyup', this.globalKeyUpHandler)
    }

    /**
     * 全局键盘抬起事件处理器。
     * @param e - 键盘事件。
     */
    private globalKeyUpHandler = (e: KeyboardEvent): void => {
        if (e.code === 'Backspace' || e.code === 'Delete') {
            this.onDelete(this.currentTransformerId)
            this.clearTransformers()
        }
    }

    private selectedShape(id: string, konvaStage: Konva.Stage) {
        const group = this.getGroupById(konvaStage, id)
        if (!group) {
            return
        }
        const shape = this.getFirstShapeInGroup(group)
        if (!shape) {
            return
        }
        this.handleShapeClick(shape, konvaStage)
    }

    /**
     * 清除选择器的所有状态和事件。
     */
    public clear(): void {
        this.clearTransformers()
        this.konvaCanvasStore.forEach(konvaCanvas => {
            const { konvaStage } = konvaCanvas
            const pageGroups = this.getPageShapeGroups(konvaStage)
            this.disableStageEvents(konvaStage)
            this.disableShapeGroups(pageGroups)
        })
    }

    /**
     * 在指定页面上激活选择器。
     * @param pageNumber - 要激活选择器的页面号。
     */
    public activate(pageNumber: number): void {
        const konvaCanvas = this.konvaCanvasStore.get(pageNumber)
        if (!konvaCanvas) return
        const { konvaStage } = konvaCanvas
        const pageGroups = this.getPageShapeGroups(konvaStage)
        this.disableStageEvents(konvaStage)
        this.bindStageEvents(konvaStage)
        this.enableShapeGroups(pageGroups, konvaStage)
        if (this.selectedId) {
            this.selectedShape(this.selectedId, konvaStage)
        }
    }

    /**
     * 选择指定的形状组。
     * @param id - 要选择的形状组的 ID。
     */
    public select(id: string): void {
        this.selectedId = id
    }
}
