import { Input, Modal } from 'antd'
import type { InputRef } from 'antd/es/input'
import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'
import React from 'react'

import { AnnotationType, DefaultSettings, IAnnotationStore, IAnnotationType, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { base64ToImageBitmap, parsePageRanges, resizeImage, setCssCustomProperty } from '../../utils/utils'
import { CURSOR_CSS_PROPERTY } from '../const'
import { Editor, IEditorOptions } from './editor'
import i18n from 'i18next'

/**
 * 批量设置盖章位置
 * @returns {Promise<{ pageRanges: number[], inputValue: string }>}
 */
async function setBatchStampPageNumbers(): Promise<{ pageRanges: number[]; inputValue: string }> {
    return new Promise(resolve => {
        const placeholder = `${i18n.t('normal.example')}1,1-2,3-4`
        let inputValue = '' // 临时变量来存储输入值
        let status: '' | 'error' | 'warning' = 'error' // 初始状态设置为错误，确保初始时提交按钮禁用
        let pageRanges: number[] = [] // 用于存储解析后的页码数组
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-const
        let modal: any
        const inputRef = React.createRef<InputRef>() // 使用 React.createRef 以确保类型正确

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            inputValue = e.target.value // 更新输入值
            try {
                pageRanges = parsePageRanges(inputValue)
                if (pageRanges.length > 0) {
                    status = '' // 清除错误状态
                } else {
                    status = 'error'
                }
            } catch (error) {
                status = 'error'
                pageRanges = [] // 清空解析结果
            }
            // 强制重新渲染 Modal
            modal.update({
                content: (
                    <div>
                        <div> {i18n.t('editor.stamp.stampRange')} {status === 'error' && placeholder}</div>
                        <Input ref={inputRef} status={status} placeholder={placeholder} onChange={handleChange} />
                    </div>
                ),
                okButtonProps: {
                    disabled: status === 'error'
                }
            })
        }

        modal = Modal.confirm({
            title: i18n.t('editor.stamp.multiPageStamping'),
            icon: null,
            content: (
                <div>
                    <div> {i18n.t('editor.stamp.stampRange')}</div>
                    <Input ref={inputRef} status={status} placeholder={placeholder} onChange={handleChange} />
                </div>
            ),
            okText: i18n.t('normal.ok'),
            cancelText: i18n.t('normal.cancel'),
            okButtonProps: {
                disabled: status === 'error'
            },
            onOk: () => {
                resolve({ pageRanges, inputValue }) // 解析 Promise 并返回输入值和解析后的页码数组
            },
            onCancel: () => {
                resolve({ pageRanges: [], inputValue: '' }) // 如果用户取消，则解析 Promise 并返回空数组和空字符串
            }
        })

        // 使用 setTimeout 确保在 Modal 完全渲染后设置焦点
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus()
            }
        }, 100)
    })
}

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
            const { newWidth, newHeight } = resizeImage(width, height, DefaultSettings.MAX_CURSOR_SIZE)
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
            const { pageRanges, inputValue } = await setBatchStampPageNumbers()
            if (pageRanges.length > 0) {
                const text = new Konva.Text({
                    x: pos.x - crosshair.x,
                    y: pos.y - crosshair.y,
                    text: `${i18n.t('editor.stamp.stampRange')}: ${inputValue}`,
                    fontSize: 10,
                    fill: 'red'
                })
                this.currentShapeGroup.konvaGroup.add(text)
            }
            // 调整图片坐标并更新 PDF.js 注解存储
            const { x, y, width, height } = this.fixImageCoordinateForGroup(this.stampImage, this.currentShapeGroup.konvaGroup)
            const id = this.currentShapeGroup.konvaGroup.id()
            this.setShapeGroupDone(
                {
                    id,
                    contentsObj: {
                        text: inputValue,
                        image: this.stampUrl
                    },
                    pageRanges
                }
                // await this.calculateImageForStorage({
                //     x,
                //     y,
                //     width,
                //     height,
                //     annotationType: this.currentAnnotation.pdfjsType,
                //     pageIndex: this.pageNumber - 1,
                //     stampUrl: this.stampUrl,
                //     id
                // }),
                // {
                //     image: this.stampUrl,
                //     text: inputValue || '',
                //     batchPdfjsAnnotationStorage: batchPdfjsAnnotationStorage
                // }
            )

            this.stampImage = null
        })
    }

    /**
     * 刷新 PDF.js 注解存储，从序列化的组字符串中恢复签章图片的信息。
     * @param groupId 形状组的 ID
     * @param groupString 序列化的组字符串
     * @param rawAnnotationStore 原始注解存储对象
     * @returns 返回更新后的 PDF.js 注解存储对象的 Promise
     */
    public async refreshPdfjsAnnotationStorage(
        groupId: string,
        groupString: string,
        rawAnnotationStore: IAnnotationStore
    ): Promise<{ annotationStorage: IPdfjsAnnotationStorage; batchPdfjsAnnotationStorage?: IPdfjsAnnotationStorage[] }> {
        return null
        // const ghostGroup = Konva.Node.create(groupString)
        // const image = this.getGroupNodesByClassName(ghostGroup, 'Image')[0] as Konva.Image
        // const { x, y, width, height } = this.fixImageCoordinateForGroup(image, ghostGroup)
        // const stampUrl = image.getAttr('base64')

        // // 计算并返回更新后的 PDF.js 注解存储对象
        // const annotationStorage = await this.calculateImageForStorage({
        //     x,
        //     y,
        //     width,
        //     height,
        //     annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
        //     pageIndex: rawAnnotationStore.pdfjsAnnotationStorage.pageIndex,
        //     stampUrl: stampUrl,
        //     id: groupId
        // })

        // // 处理批量 PDF.js 注解存储
        // const batchPdfjsAnnotationStorage: IPdfjsAnnotationStorage[] = []
        // const batchStores = rawAnnotationStore.content?.batchPdfjsAnnotationStorage

        // if (batchStores?.length > 0) {
        //     for (const store of batchStores) {
        //         const newStore = await this.calculateImageForStorage({
        //             x,
        //             y,
        //             width,
        //             height,
        //             annotationType: rawAnnotationStore.pdfjsAnnotationStorage.annotationType,
        //             pageIndex: store.pageIndex,
        //             stampUrl: stampUrl,
        //             id: `${groupId}-${store.pageIndex}`
        //         })
        //         batchPdfjsAnnotationStorage.push(newStore)
        //     }
        // }

        // return { annotationStorage, batchPdfjsAnnotationStorage }
    }

    /**
     * 调整签章图片在组内的坐标。
     * @param image Konva.Image 对象
     * @param group Konva.Group 对象
     * @returns 返回调整后的坐标信息
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
     * 将签章图片数据转换为 PDF.js 注解存储所需的数据格式。
     * @param param0 包含签章图片和相关信息的参数
     * @returns 返回处理后的 PDF.js 注解存储对象的 Promise
     */
    private async calculateImageForStorage({
        x,
        y,
        width,
        height,
        annotationType,
        pageIndex,
        stampUrl,
        id
    }: {
        x: number
        y: number
        width: number
        height: number
        annotationType: PdfjsAnnotationEditorType
        pageIndex: number
        stampUrl: string
        id: string
    }): Promise<IPdfjsAnnotationStorage> {
        const canvasHeight = this.konvaStage.size().height / this.konvaStage.scale().y
        const rectBottomRightX: number = x + width
        const rectBottomRightY: number = y + height
        const rect: [number, number, number, number] = [x, canvasHeight - y, rectBottomRightX, canvasHeight - rectBottomRightY]

        // 构造 PDF.js 注解存储对象
        const annotationStorage: IPdfjsAnnotationStorage = {
            annotationType,
            isSvg: false,
            bitmap: await base64ToImageBitmap(stampUrl),
            bitmapId: `image_${id}`,
            pageIndex,
            rect,
            rotation: 0
        }

        return annotationStorage
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
}
