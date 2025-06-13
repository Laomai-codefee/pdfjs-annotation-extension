import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'
import React from 'react'
import { Dropdown, InputRef, Modal } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { FontSizeIcon } from '../../const/icon'
import './editor_free_text.scss'
import i18n from 'i18next'
import { defaultOptions } from '../../const/default_options'

export async function setInputText(color: string, fontSize: number): Promise<{ inputValue: string, color: string, fontSize: number }> {
    let currentColor = color;
    let currentFontSize = fontSize;
    return new Promise(resolve => {
        const placeholder = i18n.t('editor.text.startTyping');
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
                                {defaultOptions.colors.map(color => (
                                    <div onClick={() => handleColorChange(color)} className={`cell ${color === currentColor ? 'active' : ''}`} key={color}>
                                        <span style={{ backgroundColor: color }}></span>
                                    </div>
                                ))}
                            </div>
                            <Dropdown menu={{
                                items: defaultOptions.fontSize.map(size => ({
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
                            {defaultOptions.colors.map(color => (
                                <div onClick={() => handleColorChange(color)} className={`cell ${color === currentColor ? 'active' : ''}`} key={color}>
                                    <span style={{ backgroundColor: color }}></span>
                                </div>
                            ))}
                        </div>
                        <Dropdown menu={{
                            items: defaultOptions.fontSize.map(size => ({
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
            wrap: textWidth > maxWidth ? 'word' : 'none'
        });
        this.currentShapeGroup.konvaGroup.add(text)

        const id = this.currentShapeGroup.konvaGroup.id()
            this.setShapeGroupDone(
                {
                    id,
                    contentsObj: {
                        text: value,
                    },
                    color,
                    fontSize
                }
            )
    }

    protected changeStyle(): void {}

}
