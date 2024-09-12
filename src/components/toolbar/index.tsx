import './index.scss'
import { ColorPicker, message } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { annotationDefinitions, AnnotationType, DefaultColors, DefaultSettings, IAnnotationType, PdfjsAnnotationEditorType } from '../../const/definitions'
import { PaletteIcon } from '../../const/icon'
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
    const [annotations, setAnnotations] = useState<IAnnotationType[]>(annotationDefinitions.filter(item => item.pdfjsType !== PdfjsAnnotationEditorType.HIGHLIGHT))
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

    const handleAdd = (signatureDataUrl, annotation) => {
        message.open({
            type: 'info',
            content: '请选择放置位置',
        })
        setDataTransfer(signatureDataUrl)
        setCurrentAnnotation(annotation)
    }

    const buttons = annotations.map((annotation, index) => {
        const isSelected = annotation.type === selectedType

        const commonProps = {
            className: isSelected ? 'selected' : ''
        }

        switch (annotation.type) {
            case AnnotationType.STAMP:
                return (
                    <li key={index} {...commonProps}>
                        <StampTool annotation={annotation} onAdd={(signatureDataUrl) => handleAdd(signatureDataUrl, annotation)} />
                    </li>
                )

            case AnnotationType.SIGNATURE:
                return (
                    <li key={index} {...commonProps}>
                        <SignatureTool annotation={annotation} onAdd={(signatureDataUrl) => handleAdd(signatureDataUrl, annotation)} />
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
            </ul>
        </div>
    )
})

export { CustomToolbar }
