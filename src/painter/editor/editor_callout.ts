import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'
import { setInputText } from './editor_free_text'

/**
 * EditorCallOut is a free callout editor class that extends from Editor.
 */
export class EditorCallout extends Editor {
    private arrow: Konva.Arrow
    private points: number[] = []
    private isDrawing = false
    private startPos: { x: number; y: number } | null = null

    private textComponent: Konva.Text
    private boxComponent: Konva.Rect
    private text: string = ''

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.CALLOUT })
        window.addEventListener('mouseup', this.globalPointerUpHandler)
        // Detect when the mouse leaves the stage
        this.konvaStage.on('mouseleave', this.cancelDrawing)
    }

    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {
        if (e.currentTarget !== this.konvaStage) return

        const pos = this.konvaStage.getRelativePointerPosition()

        if (this.isDrawing) {
            this.addPoint(pos)
            // complete editor on third pivot arrow click
            if (this.points.length == 6) {
                this.finalShape()
            }
        } else {
            this.startDrawing(pos)
        }
    }
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isDrawing || this.points.length < 2) return

        const pos = this.konvaStage.getRelativePointerPosition()
        this.updateCalloutPreview(pos)
    }

    protected async mouseUpHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {}

    // Initialize all callout konva shapes Arrow, Rect, Text
    private startDrawing(pos: { x: number; y: number }) {
        this.isDrawing = true
        this.points = [pos.x, pos.y]
        this.startPos = { x: pos.x, y: pos.y }

        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        this.arrow = new Konva.Arrow({
            points: this.points,
            fill: this.currentAnnotation.style.color || 'red',
            stroke: this.currentAnnotation.style.color || 'red',
            strokeWidth: 1,
            pointerWidth: 5,
            opacity: this.currentAnnotation.style.opacity || 1,
            lineJoin: 'round',
            closed: false,
            pointerAtBeginning: true,
            pointerAtEnding: false,
            visible: true
        })
        this.currentShapeGroup.konvaGroup.add(this.arrow)
        this.textComponent = new Konva.Text({ text: this.text, padding: 2 })
        this.boxComponent = new Konva.Rect({
            stroke: '#000',
            strokeWidth: 1,
            cornerRadius: 2
        })
        this.currentShapeGroup.konvaGroup.add(this.boxComponent)
        this.currentShapeGroup.konvaGroup.add(this.textComponent)
    }

    private addPoint(pos: { x: number; y: number }) {
        this.points.push(pos.x, pos.y)
        this.arrow.points(this.points)
        // Optimize redraw by using requestAnimationFrame
        requestAnimationFrame(() => this.arrow.getLayer().batchDraw())
    }

    private updateCalloutPreview(pos: { x: number; y: number }) {
        const tempPoints = [...this.points, pos.x, pos.y]
        this.arrow.points(tempPoints)

        requestAnimationFrame(() => this.arrow.getLayer().batchDraw())
    }

    // Finalize shape
    private async finalShape() {
        if (!this.isDrawing || this.points.length < 2) return

        this.isDrawing = false
        // Modal for add text for callout trigger
        const { inputValue, color, fontSize } = await setInputText(this.currentAnnotation.style.color, this.currentAnnotation.style.fontSize)

        const scale = this.konvaStage.scale()
        const pos = { x: this.points[this.points.length - 2], y: this.points[this.points.length - 1] }
        // update the box and text after adding text
        this.inputDoneHandler(inputValue, scale, pos, color, fontSize)
    }

    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // Only handle left mouse button
        // If mouse was released inside the stage, do nothing (mouseleave already handled)
        if (this.konvaStage.getRelativePointerPosition()) return
        // Otherwise, cancel unfinished drawing
        this.cancelDrawing()
    }

    // Initializing text component in callout shape
    private async inputDoneHandler(inputValue: string, scale: { x: number; y: number }, pos: { x: number; y: number }, color: string, fontSize: number) {
        this.text = inputValue.trim()
        if (this.text === '') {
            this.delShapeGroup(this.currentShapeGroup.id)
            this.currentShapeGroup = null
            return
        }
        const tempText = new Konva.Text({
            text: this.text,
            fontSize: fontSize,
            padding: 2
        })
        const textWidth = tempText.width()
        const maxWidth = 200
        const finalWidth = textWidth > maxWidth ? maxWidth : textWidth
        // set text box the opposite of initial arrow point
        const isLeftToRight = this.points[0] < this.points[this.points.length - 2]
        const xAxis = isLeftToRight ? pos.x : pos.x - finalWidth
        const yAxis = pos.y - 6
        this.textComponent.setAttrs({
            text: this.text,
            x: xAxis,
            y: yAxis + 2,
            width: 200,
            fontSize: fontSize,
            fill: color,
            wrap: textWidth > maxWidth ? 'word' : 'none'
        })
        this.boxComponent.setAttrs({
            x: xAxis,
            y: yAxis,
            width: finalWidth,
            height: this.textComponent.height() + 6
        })
        const id = this.currentShapeGroup.konvaGroup.id()
        this.setShapeGroupDone({
            id,
            contentsObj: {
                text: this.text
            },
            color,
            fontSize
        })
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)
    }

    private cancelDrawing = () => {
        if (!this.isDrawing) return

        this.arrow.destroy()
        this.points = []
        this.isDrawing = false
        this.startPos = null
    }
}
