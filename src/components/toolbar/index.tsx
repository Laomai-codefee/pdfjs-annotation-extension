import './index.scss'
import { ColorPicker, message } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { annotationDefinitions, AnnotationType, IAnnotationType, PdfjsAnnotationEditorType } from '../../const/definitions'
import { AnnoIcon, ExportIcon, PaletteIcon, SaveIcon } from '../../const/icon'
import { SignatureTool } from './signature'
import { StampTool } from './stamp'
import { useTranslation } from 'react-i18next'
import { defaultOptions } from '../../const/default_options'

interface CustomToolbarProps {
    onChange: (annotation: IAnnotationType | null, dataTransfer: string | null) => void
    onSave: () => void
    onExport: () => void
    onSidebarOpen: (open: boolean) => void
}

export interface CustomToolbarRef {
    activeAnnotation(annotation: IAnnotationType): void
    toggleSidebarBtn(open: boolean) :void
}

/**
 * @description CustomToolbar
 */
const CustomToolbar = forwardRef<CustomToolbarRef, CustomToolbarProps>(function CustomToolbar(props, ref) {
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationType | null>(null)
    const [annotations, setAnnotations] = useState<IAnnotationType[]>(annotationDefinitions.filter(item => item.pdfjsEditorType !== PdfjsAnnotationEditorType.HIGHLIGHT))
    const [dataTransfer, setDataTransfer] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(defaultOptions.setting.DEFAULT_SIDE_BAR_OPEN)
    const { t } = useTranslation()

    useImperativeHandle(ref, () => ({
        activeAnnotation,
        toggleSidebarBtn
    }))

    const activeAnnotation = (annotation: IAnnotationType) => {
        handleAnnotationClick(annotation)
    }

    const toggleSidebarBtn = (open: boolean) => {
        setSidebarOpen(open)
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
            content: t('toolbar.message.selectPosition'),
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
                    <li title={t(`annotations.${annotation.name}`)} key={index} {...commonProps}>
                        <StampTool annotation={annotation} onAdd={(signatureDataUrl) => handleAdd(signatureDataUrl, annotation)} />
                    </li>
                )

            case AnnotationType.SIGNATURE:
                return (
                    <li title={t(`annotations.${annotation.name}`)} key={index} {...commonProps}>
                        <SignatureTool annotation={annotation} onAdd={(signatureDataUrl) => handleAdd(signatureDataUrl, annotation)} />
                    </li>
                )

            default:
                return (
                    <li title={t(`annotations.${annotation.name}`)} key={index} {...commonProps} onClick={() => handleAnnotationClick(isSelected ? null : annotation)}>
                        <div className="icon">{annotation.icon}</div>
                        <div className="name">{t(`annotations.${annotation.name}`)}</div>
                    </li>
                )
        }
    })

    const isColorDisabled = !currentAnnotation?.style?.color

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

    const handleSidebarOpen = (isOpen) => {
        props.onSidebarOpen(!isOpen)
        setSidebarOpen(!isOpen)
    }

    return (
        <div className="CustomToolbar">
            <ul className="buttons">
                {buttons}
                <ColorPicker
                    arrow={false}
                    disabledAlpha
                    value={currentAnnotation?.style?.color || defaultOptions.setting.COLOR}
                    disabled={isColorDisabled}
                    showText={false}
                    onChangeComplete={color => handleColorChange(color.toHexString())}
                    presets={[{ label: '', colors: defaultOptions.colors }]}
                >
                    <li className={isColorDisabled ? 'disabled' : ''} title={t('normal.color')}>
                        <div className="icon">
                            <PaletteIcon style={{ color: currentAnnotation?.style?.color }} />
                        </div>
                        <div className="name">{t('normal.color')}</div>
                    </li>
                </ColorPicker>
            </ul>
            <div className="splitToolbarButtonSeparator"></div>
            <ul className="buttons">
                {
                    defaultOptions.setting.SAVE_BUTTON && <li title={t('normal.save')} onClick={() => {
                        props.onSave()
                    }}>
                        <div className="icon">
                            <SaveIcon />
                        </div>
                        <div className="name">{t('normal.save')}</div>
                    </li>
                }
                {
                    defaultOptions.setting.EXPORT_BUTTON && <li title={t('normal.export')} onClick={() => {
                        props.onExport()
                    }}>
                        <div className="icon">
                            <ExportIcon />
                        </div>
                        <div className="name">{t('normal.export')}</div>
                    </li>
                }

            </ul>
            <ul className="buttons right">
                <li
                onClick={() => handleSidebarOpen(sidebarOpen)}
                className={`${sidebarOpen? 'selected': ''}`}
                >
                    <div className="icon">
                        <AnnoIcon />
                    </div>
                    <div className="name">{t('anno')}</div>
                </li>
            </ul>
        </div>
    )
})

export { CustomToolbar }
