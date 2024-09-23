import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType, DefaultColors, DefaultFontSize, IAnnotationStore, IPdfjsAnnotationStorage, PdfjsAnnotationEditorType } from '../../const/definitions'
import { base64ToImageBitmap } from '../../utils/utils'
import { Editor, IEditorOptions } from './editor'
import React from 'react'
import { Dropdown, InputRef, Modal } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { FontSizeIcon } from '../../const/icon'
import './editor_free_text.scss'
import i18n from 'i18next'

async function setInputText(color: string, fontSize: number): Promise<{ inputValue: string, color: string, fontSize: number }> {
    let currentColor = color;
    let currentFontSize = fontSize;
    return new Promise(resolve => {
        const placeholder =i18n.t('editor.text.startTyping');
        let inputValue = '';
        let status: '' | 'error' | 'warning' = 'error'; // 初始状态设置为错误，确保初始时提交按钮禁用
        let modal: any;
        const inputRef = React.createRef<InputRef>(); // 使用 React.createRef 以确保类型正确

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            inputValue = e.target.value; // 更新输入值
            status = inputValue.trim() !== '' ? '' : 'error'; // 根据输入内容更新状态
            updateModalContent(); // 更新模态框内容
        };

        const updateModalContent = () => {
            modal.update({
                title: `${i18n.t('annotations.freeText')}-${currentFontSize}px`,
                content: (
                    <div>
                        <TextArea
                            ref={inputRef} status={status} placeholder={placeholder} onChange={handleChange}
                            autoSize={{ minRows: 3, maxRows: 5 }}
                        />
                        <div className='EditorFreeText-Modal-Toolbar'>
                            <div className="colorPalette">
                                {DefaultColors.map(color => (
                                    <div onClick={() => handleColorChange(color)} className={`cell ${color === currentColor ? 'active' : ''}`} key={color}>
                                        <span style={{ backgroundColor: color }}></span>
                                    </div>
                                ))}
                            </div>
                            <Dropdown menu={{
                                items: DefaultFontSize.map(size => ({
                                    key: size.toString(),
                                    label: size,
                                    onClick: () => handleFontSizeChange(size)
                                }))
                            }} trigger={['click']}>
                                <FontSizeIcon />
                            </Dropdown>
                        </div>
                    </div>
                ),
                okButtonProps: {
                    disabled: status === 'error',
                },
            });
        };

        const handleColorChange = (color: string) => {
            currentColor = color; // 更新当前颜色
            updateModalContent();
        };

        const handleFontSizeChange = (fontSize: number) => {
            currentFontSize = fontSize;
            updateModalContent();
        };

        modal = Modal.confirm({
            title: `${i18n.t('annotations.freeText')}-${currentFontSize}px`,
            icon: null,
            content: (
                <div className='EditorFreeText-Modal'>
                    <TextArea
                        ref={inputRef} status={status} placeholder={placeholder} onChange={handleChange}
                        autoSize={{ minRows: 3, maxRows: 5 }}
                    />
                    <div className='EditorFreeText-Modal-Toolbar'>
                        <div className="colorPalette">
                            {DefaultColors.map(color => (
                                <div onClick={() => handleColorChange(color)} className={`cell ${color === currentColor ? 'active' : ''}`} key={color}>
                                    <span style={{ backgroundColor: color }}></span>
                                </div>
                            ))}
                        </div>
                        <Dropdown menu={{
                            items: DefaultFontSize.map(size => ({
                                key: size.toString(),
                                label: size,
                                onClick: () => handleFontSizeChange(size)
                            }))
                        }} trigger={['click']}>
                            <FontSizeIcon />
                        </Dropdown>
                    </div>
                </div>
            ),
            destroyOnClose: true,
            okText: i18n.t('normal.ok'),
            cancelText: i18n.t('normal.cancel'),
            okButtonProps: {
                disabled: status === 'error',
            },
            onOk: () => {
                resolve({ inputValue, color: currentColor, fontSize: currentFontSize }); // 解析 Promise 并返回输入值
            },
            onCancel: () => {
                resolve({ inputValue: '', color: currentColor, fontSize: currentFontSize }); // 如果用户取消，则解析 Promise 并返回空字符串
            }
        });
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
    });
}

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

    protected mouseDownHandler() { }
    protected mouseMoveHandler() { }


    /**
     * 处理鼠标抬起事件，创建输入区域。
     * @param e Konva 事件对象
     */
    protected async mouseUpHandler(e: KonvaEventObject<PointerEvent>) {
        const pos = this.konvaStage.getRelativePointerPosition()
        const { x, y } = this.konvaStage.scale()
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
        const { inputValue, color, fontSize } = await setInputText(this.currentAnnotation.style.color, this.currentAnnotation.style.fontSize)
        this.inputDoneHandler(inputValue, { x, y }, pos, color, fontSize)
    }

    /**
     * 处理输入完成后的操作。
     * @param inputValue string 输入值
     * @param scaleY Y 轴缩放比例
     * @param pos 相对位置坐标
     */
    private async inputDoneHandler(inputValue: string, scale: { x: number; y: number }, pos: { x: number; y: number }, color: string, fontSize: number) {
        const value = inputValue.trim();
        if (value === '') {
            this.delShapeGroup(this.currentShapeGroup.id);
            this.currentShapeGroup = null;
            return;
        }
        const tempText = new Konva.Text({
            text: value,
            fontSize: fontSize,
            padding: 2
        });
        const textWidth = tempText.width();
        const maxWidth = 300;
        const finalWidth = textWidth > maxWidth ? maxWidth : textWidth;
        const text = new Konva.Text({
            x: pos.x,
            y: pos.y + 2,
            text: value,
            width: finalWidth,
            fontSize: fontSize,
            fill: color,
            padding: 2,
            wrap: textWidth > maxWidth ? 'word' : 'none'
        });
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
