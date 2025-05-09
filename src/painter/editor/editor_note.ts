import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'
import './editor_free_text.scss'
import { setInputText } from './editor_free_text'
/**
 * EditorNote is a free sticky note class that extends from Editor.
 */
export class EditorNote extends Editor {
    /**
     * Creates an instance of EditorNote.
     * @param EditorOptions Options to initialize the editor
     */
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.NOTE })
    }

    protected mouseDownHandler() {}
    protected mouseMoveHandler() {}

    /**
     * Handles the mouse up event and creates an input area.
     * @param e Konva event object
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
     * Handles the operations after input is completed.
     * @param inputValue string The input value
     * @param scaleY The scale ratio on the Y-axis
     * @param pos The relative position coordinates
     */
    private async inputDoneHandler(inputValue: string, scale: { x: number; y: number }, pos: { x: number; y: number }, color: string, fontSize: number) {
        const value = inputValue.trim()
        if (value === '') {
            this.delShapeGroup(this.currentShapeGroup.id)
            this.currentShapeGroup = null
            return
        }
        const svgString = `<svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="${color}"
            stroke="black"
            stroke-width="1"
            >
            <path
                d="M3 5c0-1.66 1.34-3 3-3h12c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3h-6l-4 4v-4H6c-1.66 0-3-1.34-3-3V5z"
            />
            <line x1="6" y1="8" x2="18" y2="8" stroke-width="1" stroke-linecap="round"/>
            <line x1="6" y1="12" x2="14" y2="12" stroke-width="1" stroke-linecap="round"/>
            </svg>`

        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
        const svgUrl = URL.createObjectURL(svgBlob)
        Konva.Image.fromURL(svgUrl, imageNode => {
            this.currentShapeGroup.konvaGroup.add(imageNode)
            imageNode.setAttrs({
                x: pos.x - 10, // Adjust position based on the image size
                y: pos.y - 24,
                width: 24, // Match SVG width
                height: 22, // Match SVG height
                id: 'note'
            })
            let textNode: Konva.Text | null = null
            let rectNode: Konva.Rect | null = null

            imageNode.on('mouseenter', () => {
                textNode = new Konva.Text({
                    x: imageNode.attrs.x + 35,
                    y: imageNode.attrs.y + 5,
                    text: value || '--',
                    fill: '#000',
                    padding: 5
                })

                rectNode = new Konva.Rect({
                    x: textNode.x() - 5,
                    y: textNode.y() - 5,
                    stroke: '#000',
                    strokeWidth: 1,
                    fill: '#FFD699',
                    width: textNode.width() + 10,
                    height: textNode.height() + 10,
                    cornerRadius: 5
                })

                this.currentShapeGroup.konvaGroup.add(rectNode)
                this.currentShapeGroup.konvaGroup.add(textNode)
            })

            imageNode.on('mouseleave', () => {
                if (textNode) {
                    textNode.destroy()
                    textNode = null
                }
                if (rectNode) {
                    rectNode.destroy()
                    rectNode = null
                }
                this.currentShapeGroup.konvaGroup.draw()
            })
            const id = this.currentShapeGroup.konvaGroup.id()
            this.setShapeGroupDone({
                id,
                contentsObj: {
                    text: value
                },
                color,
                fontSize
            })
        })
    }
}
