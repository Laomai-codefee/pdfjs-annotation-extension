import './index.scss'

import { computePosition, flip } from '@floating-ui/dom'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { annotationDefinitions, IAnnotationStore } from '../../const/definitions'
import { IRect } from 'konva/lib/types'
import { AnnoIcon, DeleteIcon, PaletteIcon } from '../../const/icon'

interface CustomAnnotationMenuProps {
    onOpenComment: (annotation: IAnnotationStore) => void
    onChangeStyle: (annotation: IAnnotationStore) => void
    onDelete: (annotation: IAnnotationStore) => void
}

export interface CustomAnnotationMenuRef {
    open(annotation: IAnnotationStore, selectorRect: IRect): void
    close(): void
}

/**
 * @description CustomAnnotationMenu
 */
const CustomAnnotationMenu = forwardRef<CustomAnnotationMenuRef, CustomAnnotationMenuProps>(function CustomAnnotationMenu(props, ref) {
    const [show, setShow] = useState(false)
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationStore | null>(null)

    const containerRef = useRef<HTMLDivElement | null>(null)

    useImperativeHandle(ref, () => ({
        open,
        close
    }))

    const open = (annotation: IAnnotationStore, selectorRect: IRect) => {
        setCurrentAnnotation(annotation)
        setShow(true)

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
    }

    const isStyleSupported = currentAnnotation
        ? annotationDefinitions.find(item => item.type === currentAnnotation.type)?.styleEditable
        : false

    return (
        <div className={`CustomAnnotationMenu ${show ? 'show' : 'hide'}`} ref={containerRef}>
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
                            props.onChangeStyle(currentAnnotation)
                            close()
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
        </div>
    )
})

export { CustomAnnotationMenu }
