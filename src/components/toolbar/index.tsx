import './index.scss'

import { ColorPicker, Dropdown } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { annotationDefinitions, AnnotationType, DefaultColors, DefaultFontSize, DefaultSettings, IAnnotationType } from '../../const/definitions'
import { FontSizeIcon, PaletteIcon } from '../../const/icon'
import { SignatureTool } from './signature'
import { StampTool } from './stamp'

interface CustomToolbarProps {
    onChange: (annotation: IAnnotationType | null, dataTransfer: string | null) => void
}

export interface CustomToolbarRef {
    activeAnnotation(annotation: IAnnotationType): void
}

/**
 * @description CustomToolbar
 */
const CustomToolbar = forwardRef<CustomToolbarRef, CustomToolbarProps>(function CustomToolbar(props, ref) {
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationType | null>(null)
    const [annotations, setAnnotations] = useState<IAnnotationType[]>(annotationDefinitions)
    const [dataTransfer, setDataTransfer] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
        activeAnnotation
    }))

    const activeAnnotation = (annotation: IAnnotationType) => {
        handleAnnotationClick(annotation)
    }

    const selectedType = currentAnnotation?.type

    const handleAnnotationClick = (annotation: IAnnotationType | null) => {
        setCurrentAnnotation(annotation)
        if (annotation?.type !== AnnotationType.SIGNATURE) {
            setDataTransfer(null) // 非签名类型时清空 dataTransfer
        }
    }

    const buttons = annotations.map((annotation, index) => {
        const isSelected = annotation.type === selectedType

        const commonProps = {
            className: isSelected ? 'selected' : ''
        }

        const handleAdd = signatureDataUrl => {
            setDataTransfer(signatureDataUrl)
            setCurrentAnnotation(annotation)
        }

        switch (annotation.type) {
            case AnnotationType.STAMP:
                return (
                    <li key={index} {...commonProps}>
                        <StampTool annotation={annotation} onAdd={handleAdd} />
                    </li>
                )

            case AnnotationType.SIGNATURE:
                return (
                    <li key={index} {...commonProps}>
                        <SignatureTool annotation={annotation} onAdd={handleAdd} />
                    </li>
                )

            default:
                return (
                    <li key={index} {...commonProps} onClick={() => handleAnnotationClick(isSelected ? null : annotation)}>
                        <div className="icon">{annotation.icon}</div>
                        <div className="name">{annotation.name}</div>
                    </li>
                )
        }
    })

    const isColorDisabled = !currentAnnotation?.style?.color
    const isFontSizeDisabled = !currentAnnotation?.style?.fontSize

    useEffect(() => {
        // 调用 onChange 并传递当前的 annotation 和 dataTransfer
        props.onChange(currentAnnotation, dataTransfer)
    }, [currentAnnotation, dataTransfer, props])

    const handleColorChange = (color: string) => {
        if (!currentAnnotation) return
        const updatedAnnotation = { ...currentAnnotation, style: { ...currentAnnotation.style, color } }
        const updatedAnnotations = annotations.map(annotation => (annotation.type === currentAnnotation.type ? updatedAnnotation : annotation))
        setAnnotations(updatedAnnotations)
        setCurrentAnnotation(updatedAnnotation)
    }

    // 处理字体大小变化
    const handleFontSizeChange = (size: number) => {
        if (!currentAnnotation) return
        const updatedAnnotation = { ...currentAnnotation, style: { ...currentAnnotation.style, fontSize: size } }
        const updatedAnnotations = annotations.map(annotation => (annotation.type === currentAnnotation.type ? updatedAnnotation : annotation))
        setAnnotations(updatedAnnotations)
        setCurrentAnnotation(updatedAnnotation)
    }

    // 构建字体大小的菜单项
    const fontSizeMenuItems = DefaultFontSize.map(size => ({
        key: size.toString(),
        label: size,
        onClick: () => handleFontSizeChange(size)
    }))

    return (
        <div className="CustomToolbar">
            <ul className="buttons">{buttons}</ul>
            <div className="splitToolbarButtonSeparator"></div>
            <ul className="buttons">
                <ColorPicker
                    disabledAlpha
                    value={currentAnnotation?.style?.color || DefaultSettings.COLOR}
                    disabled={isColorDisabled}
                    showText={false}
                    onChangeComplete={color => handleColorChange(color.toHexString())}
                    presets={[{ label: '标准色', colors: DefaultColors }]}
                >
                    <li className={isColorDisabled ? 'disabled' : ''}>
                        <div className="icon">
                            <PaletteIcon style={{ color: currentAnnotation?.style?.color }} />
                        </div>
                        <div className="name">颜色</div>
                    </li>
                </ColorPicker>
                <Dropdown menu={{ items: fontSizeMenuItems }} trigger={['click']}>
                    <li className={isFontSizeDisabled ? 'disabled' : ''}>
                        <div className="icon">
                            <FontSizeIcon />
                        </div>
                        <div className="name">字号</div>
                    </li>
                </Dropdown>
            </ul>
        </div>
    )
})

export { CustomToolbar }
