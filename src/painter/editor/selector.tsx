import Konva from 'konva'

import { IAnnotationStore } from '../../const/definitions'
import { SELECTOR_HOVER_STYLE, SHAPE_GROUP_NAME } from '../const'
import { KonvaCanvas } from '../index'
import { Modal } from 'antd'
import i18n from 'i18next'
import { IRect } from 'konva/lib/types'
import { defaultOptions } from '../../const/default_options'
/**
 * 定义选择器的选项接口
 */
export interface ISelectorOptions {
    konvaCanvasStore: Map<number, KonvaCanvas> // 存储各个页面的 Konva 画布实例
    getAnnotationStore: (id: string) => IAnnotationStore // 获取注解存储的方法
    onSelected: (id: string, isClick: boolean, transformerRect: IRect) => void // 选中回调
    onCancel: () => void
    onChanged: (id: string, konvaGroupString: string, rawAnnotationStore: IAnnotationStore, konvaClientRect: IRect, transformerRect: IRect) => void // 注解变化时的回调
    onDelete: (id: string) => void // 删除注解时的回调
}

/**
 * 定义选择器类
 */
export class Selector {
    public readonly onSelected: (id: string, isClick: boolean, clientRect: IRect) => void
    public readonly onChanged: (id: string, konvaGroupString: string, rawAnnotationStore: IAnnotationStore, konvaClientRect: IRect, transformerRect: IRect) => void
    public readonly onDelete: (id: string) => void
    public readonly onCancel: () => void
    private transformerStore: Map<string, Konva.Transformer> = new Map() // 存储变换器实例
    private getAnnotationStore: (id: string) => IAnnotationStore // 获取注解存储的方法
    private konvaCanvasStore: Map<number, KonvaCanvas> // 存储各个页面的 Konva 画布实例

    private _currentTransformerId: string | null = null // 当前激活的变换器ID

    private selectedId: string | null = null

    // 构造函数，初始化选择器类
    constructor({ konvaCanvasStore, getAnnotationStore, onDelete, onSelected, onCancel, onChanged }: ISelectorOptions) {
        this.konvaCanvasStore = konvaCanvasStore
        this.getAnnotationStore = getAnnotationStore
        this.onDelete = onDelete
        this.onSelected = onSelected
        this.onCancel = onCancel
        this.onChanged = onChanged
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
        if (defaultOptions.setting.DB_CLICK_DELETE) {
            shape.on('pointerdblclick', () => {
                Modal.confirm({
                    title: i18n.t('normal.deleteConfirm'),
                    type: 'warn',
                    destroyOnClose: true,
                    centered: true,
                    okText: i18n.t('normal.yes'),
                    cancelText: i18n.t('normal.no'),
                    onOk: () => {
                        this.onDelete(this.currentTransformerId)
                        this.clearTransformers()
                    }
                })
            })
        }


        shape.on('pointerclick', e => {
            if (e.evt.button === 0) {
                this.handleShapeClick(shape, konvaStage, true)
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
    private handleShapeClick(shape: Konva.Shape, konvaStage: Konva.Stage, isClick: boolean = false): void {
        const group = shape.findAncestor(`.${SHAPE_GROUP_NAME}`) as Konva.Group

        if (!group) return
        this.clearTransformers() // 清除之前的变换器
        this.createTransformer(group, konvaStage, !isClick)
        const selectorRect = this.transformerStore.get(group.id()).getClientRect()
        this.onSelected(group.id(), isClick, selectorRect)
    }

    /**
     * 创建变形区域
     * @param group
     * @param konvaStage
     */
    private createTransformer(group: Konva.Group, konvaStage: Konva.Stage, flash: boolean) {
        const line = group.children[0] as Konva.Line
        const groupId = group.id()
        this.currentTransformerId = groupId
        const rawAnnotationStore = this.getAnnotationStore(groupId)
        group.off('dragend')
        const transformer = new Konva.Transformer({
            resizeEnabled: rawAnnotationStore.resizable,
            rotateEnabled: false,
            borderStrokeWidth: defaultOptions.chooseSetting.STROKEWIDTH,
            borderStroke: defaultOptions.chooseSetting.COLOR,
            anchorFill: defaultOptions.chooseSetting.COLOR,
            anchorStroke: defaultOptions.chooseSetting.COLOR,
            opacity: defaultOptions.chooseSetting.OPACITY,
            anchorCornerRadius: 5,
            anchorStrokeWidth: 2,
            anchorSize: 8,
            padding: 1,
            boundBoxFunc: (oldBox, newBox) => {
                newBox.width = Math.max(30, newBox.width)
                return newBox
            }
        })

        if (line.attrs.id && line.attrs.id === 'note') {
            transformer.resizeEnabled(false)
        }
        group.draggable(rawAnnotationStore.draggable)

        transformer.off('transformend')
        transformer.off('transformstart')
        transformer.on('transformend', () => {
            this.onChanged(group.id(), group.toJSON(), { ...rawAnnotationStore }, Konva.Node.create(group.toJSON()).getClientRect(), transformer.getClientRect())
        })
        transformer.on('transformstart', () => {
            this.onCancel()
        })

        transformer.on('dragstart', () => {
            this.onCancel()
        })

        transformer.on('dragend', () => {
            this.onChanged(group.id(), group.toJSON(), { ...rawAnnotationStore }, Konva.Node.create(group.toJSON()).getClientRect(), transformer.getClientRect())
        })

        transformer.on('dragmove', () => {
            const boxes = transformer.nodes().map(node => node.getClientRect())
            const box = this.getTotalBox(boxes)
            transformer.nodes().forEach(shape => {
                const absPos = shape.getAbsolutePosition()
                // where are shapes inside bounding box of all shapes?
                const offsetX = box.x - absPos.x
                const offsetY = box.y - absPos.y

                // we total box goes outside of viewport, we need to move absolute position of shape
                const halfWidth = box.width / 2
                const halfHeight = box.height / 2
                const newAbsPos = { ...absPos }
                if (box.x + halfWidth < 0) {
                    newAbsPos.x = -offsetX - halfWidth
                }
                if (box.y + halfHeight < 0) {
                    newAbsPos.y = -offsetY - halfHeight
                }
                if (box.x + halfWidth > konvaStage.width()) {
                    newAbsPos.x = konvaStage.width() - halfWidth - offsetX
                }
                if (box.y + halfHeight > konvaStage.height()) {
                    newAbsPos.y = konvaStage.height() - halfHeight - offsetY
                }
                shape.setAbsolutePosition(newAbsPos)
            })
        })

        transformer.nodes([group])
        this.getBackgroundLayer(konvaStage).add(transformer)
        this.transformerStore.set(groupId, transformer)
        if (flash) {
            this.flashNodeWithTransformer(group, transformer, () => {
                this.onSelected(group.id(), false, transformer.getClientRect())
            });
        }
    }
    private flashNodeWithTransformer(
        group: Konva.Group,
        transformer: Konva.Transformer,
        onFinish?: () => void
    ) {
        let flashCount = 0;
        const maxFlashes = 1;
        const fadeDuration = 0.1;

        const originalStroke = transformer.borderStroke();
        const highlightStroke = 'red';

        const fadeOut = () => {
            const groupTween = new Konva.Tween({
                node: group,
                duration: fadeDuration,
                opacity: 0,
                onFinish: () => {
                    try {
                        transformer.borderStroke(highlightStroke);
                        transformer.getLayer()?.batchDraw();
                        fadeIn();
                    } catch { }
                }
            });
            groupTween.play();
        };

        const fadeIn = () => {
            const groupTween = new Konva.Tween({
                node: group,
                duration: fadeDuration,
                opacity: 1,
                onFinish: () => {
                    try {
                        transformer.borderStroke(originalStroke);
                        transformer.getLayer()?.batchDraw();
                        flashCount++;
                        if (flashCount < maxFlashes) {
                            setTimeout(fadeOut, 100);
                        } else {
                            // ✅ 动画全部完成，调用回调
                            if (onFinish) {
                                onFinish();
                            }
                        }
                    } catch { }

                }
            });
            groupTween.play();
        };

        fadeOut(); // 启动第一轮
    }



    /**
     * 获取所有形状的总包围盒。
     * @param boxes
     * @returns
     */
    private getTotalBox(boxes: IRect[]): IRect {
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        boxes.forEach(box => {
            minX = Math.min(minX, box.x)
            minY = Math.min(minY, box.y)
            maxX = Math.max(maxX, box.x + box.width)
            maxY = Math.max(maxY, box.y + box.height)
        })
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        }
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
        this.onCancel()
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

    private selectedShape(id: string, konvaStage: Konva.Stage) {
        const group = this.getGroupById(konvaStage, id)
        if (!group) {
            return
        }
        const shape = this.getFirstShapeInGroup(group)
        if (!shape) {
            return
        }
        this.handleShapeClick(shape, konvaStage, false)
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

    public delete() {
        this.clearTransformers()
    }
}
