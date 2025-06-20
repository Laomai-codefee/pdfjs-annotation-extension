import './index.scss'

import { computePosition, flip } from '@floating-ui/dom'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { annotationDefinitions, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { IRect } from 'konva/lib/types'
import { AnnoIcon, DeleteIcon, PaletteIcon } from '../../const/icon'
import { defaultOptions } from '../../const/default_options'
import { Divider, Form, Slider } from 'antd'
import Konva from 'konva'
import { isSameColor } from '../../utils/utils'
import { useTranslation } from 'react-i18next'

interface CustomAnnotationMenuProps {
    onOpenComment: (annotation: IAnnotationStore) => void
    onChangeStyle: (annotation: IAnnotationStore, styles: IAnnotationStyle) => void
    onDelete: (annotation: IAnnotationStore) => void
}

export interface CustomAnnotationMenuRef {
    open(annotation: IAnnotationStore, selectorRect: IRect): void
    close(): void
}

function getKonvaShapeForString(konvaString: string) {
    const ghostGroup = Konva.Node.create(konvaString) // 根据序列化字符串创建 Konva.Group 对象
    return ghostGroup.children[0]
}

/**
 * @description CustomAnnotationMenu
 */
const CustomAnnotationMenu = forwardRef<CustomAnnotationMenuRef, CustomAnnotationMenuProps>(function CustomAnnotationMenu(props, ref) {
    const [show, setShow] = useState(false)
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationStore | null>(null)

    const [currentColor, setCurrentColor] = useState<string | null>(defaultOptions.setting.COLOR)

    const [strokeWidth, setStrokeWidth] = useState<number | null>(defaultOptions.setting.STROKE_WIDTH)

    const [opacity, seOpacity] = useState<number | null>(defaultOptions.setting.OPACITY)

    const [showStyle, setShowStyle] = useState(false)

    const containerRef = useRef<HTMLDivElement | null>(null)

    const { t } = useTranslation()


    useImperativeHandle(ref, () => ({
        open,
        close
    }))

    const open = (annotation: IAnnotationStore, selectorRect: IRect) => {
        setCurrentAnnotation(annotation)
        setShow(true)
        const currentShape = getKonvaShapeForString(annotation.konvaString)
        setCurrentColor(currentShape.stroke())
        setStrokeWidth(currentShape.strokeWidth())
        seOpacity(currentShape.opacity() * 100)
        requestAnimationFrame(() => {
            const menuEl = containerRef.current
            if (!menuEl) return

            const konvaContainer = document.querySelector('.konvajs-content') as HTMLElement
            const containerRect = konvaContainer?.getBoundingClientRect?.()

            const scaleX = 1
            const scaleY = 1

            const realX = selectorRect.x * scaleX + containerRect.left
            const realY = selectorRect.y * scaleY + containerRect.top

            const virtualEl = {
                getBoundingClientRect() {
                    return {
                        x: realX,
                        y: realY,
                        width: selectorRect.width * scaleX,
                        height: selectorRect.height * scaleY,
                        left: realX,
                        top: realY,
                        right: realX + selectorRect.width * scaleX,
                        bottom: realY + selectorRect.height * scaleY,
                    }
                }
            }

            computePosition(virtualEl, menuEl, {
                placement: 'bottom',
                middleware: [flip()],
            }).then(({ x, y }) => {
                Object.assign(menuEl.style, {
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                })
            })
        })
    }

    const close = () => {
        setShow(false)
        setCurrentAnnotation(null)
        setShowStyle(false)
    }

    const isStyleSupported = currentAnnotation && annotationDefinitions.find(item => item.type === currentAnnotation.type)?.styleEditable

    const handleAnnotationStyleChange = (style: IAnnotationStyle) => {
        if (!currentAnnotation) return
        props.onChangeStyle(currentAnnotation, style)
    }
    return (
        <div className={`CustomAnnotationMenu ${show ? 'show' : 'hide'}`} ref={containerRef}>

            {
                showStyle && currentAnnotation && (
                    <div className="styleContainer">
                        {
                            isStyleSupported.color && (
                                <div className="colorPalette">
                                    {defaultOptions.colors.map(color => (
                                        <div key={color} className={`cell ${isSameColor(color, currentColor) ? 'active' : ''}`} onMouseDown={() => {
                                            handleAnnotationStyleChange({ color })
                                            setCurrentColor(color)
                                        }}>
                                            <span style={{ backgroundColor: color }}></span>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                        {
                            (isStyleSupported.opacity || isStyleSupported.strokeWidth) && (
                                <>
                                    <Divider size='small' />
                                    <div className='prototypeSetting'>
                                        <Form
                                            layout='vertical'
                                        >
                                            {
                                                isStyleSupported.strokeWidth && (<Form.Item label={`${t('normal.strokeWidth')} (${strokeWidth})`}>
                                                    <Slider
                                                        value={strokeWidth}
                                                        min={1}
                                                        max={20}
                                                        onChange={(value) => {
                                                            handleAnnotationStyleChange({ strokeWidth: value })
                                                            setStrokeWidth(value)
                                                        }}
                                                    />
                                                </Form.Item>)
                                            }
                                            {
                                                isStyleSupported.opacity && (<Form.Item label={`${t('normal.opacity')} (${opacity}%)`}>
                                                    <Slider
                                                        value={opacity}
                                                        min={0}
                                                        max={100}
                                                        onChange={(value) => {
                                                            handleAnnotationStyleChange({ opacity: value / 100 })
                                                            seOpacity(value)
                                                        }}
                                                    />
                                                </Form.Item>)
                                            }

                                        </Form>
                                    </div></>
                            )
                        }


                    </div>
                )
            }

            {
                !showStyle && currentAnnotation && (
                    <ul className="buttons">
                        <li onMouseDown={() => {
                            if (currentAnnotation) {
                                props.onOpenComment(currentAnnotation)
                                close()
                            }
                        }}>
                            <div className="icon">
                                <AnnoIcon />
                            </div>
                        </li>

                        {isStyleSupported && (
                            <li onMouseDown={() => {
                                if (currentAnnotation) {
                                    setShowStyle(true)
                                }
                            }}>
                                <div className="icon">
                                    <PaletteIcon />
                                </div>
                            </li>
                        )}

                        <li onMouseDown={() => {
                            if (currentAnnotation) {
                                props.onDelete(currentAnnotation)
                                close()
                            }
                        }}>
                            <div className="icon">
                                <DeleteIcon />
                            </div>
                        </li>
                    </ul>
                )
            }


        </div>
    )
})

export { CustomAnnotationMenu }
