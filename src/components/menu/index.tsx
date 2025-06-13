import './index.scss'

import { computePosition, flip } from '@floating-ui/dom'
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { IAnnotationStore } from '../../const/definitions'
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

    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationStore>(null)

    const containerRef = useRef<HTMLDivElement | null>(null)

    useImperativeHandle(ref, () => ({
        open,
        close
    }))

    const open = (annotation: IAnnotationStore, selectorRect: IRect) => {
        setCurrentAnnotation(annotation)
        setShow(true)
        // 异步执行位置计算，等待组件渲染
        requestAnimationFrame(() => {
            const menuEl = containerRef.current
            if (!menuEl) return

            // 获取 Konva 容器相对于页面的位置
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

    return (
        <>
            <div className={`CustomAnnotationMenu ${show ? 'show' : 'hide'}`} ref={containerRef}>
                <ul className="buttons">
                    <li onMouseDown={() => {
                        props.onOpenComment(currentAnnotation)
                        close();
                    }}>
                        <div className="icon" >
                            <AnnoIcon />
                        </div>
                    </li>
                    <li onMouseDown={() => {
                        props.onChangeStyle(currentAnnotation)
                        close();
                    }}>
                        <div className="icon" >
                            <PaletteIcon />
                        </div>
                    </li>
                    <li onMouseDown={() => {
                        props.onDelete(currentAnnotation)
                        close();
                    }}>
                        <div className="icon" >
                            <DeleteIcon />
                        </div>
                    </li>
                </ul>
            </div>
        </>
    )
})

export { CustomAnnotationMenu }
