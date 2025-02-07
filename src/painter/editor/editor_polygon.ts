import Konva from 'konva'
import { KonvaEventObject } from 'konva/lib/Node'

import { AnnotationType } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'

export class EditorPolygon extends Editor {
    private polygon: Konva.Line
    private points: number[] = []
    private isDrawing = false
    private startPos: { x: number; y: number } | null = null

    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.POLYGON })
        window.addEventListener('mouseup', this.globalPointerUpHandler)
        // Detect when the mouse leaves the stage
        this.konvaStage.on('mouseleave', this.cancelDrawing)
    }

    protected mouseDownHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {
        if (e.currentTarget !== this.konvaStage) return

        const pos = this.konvaStage.getRelativePointerPosition()

        if (!this.isDrawing) {
            this.startDrawing(pos)
        } else {
            // Check if the clicked point is near the start point
            if (this.isClosingPolygon(pos)) {
                this.finalShape() // Close the polygon
            } else {
                this.addPoint(pos)
            }
        }
    }
    protected mouseMoveHandler(e: KonvaEventObject<MouseEvent | TouchEvent>) {
        if (!this.isDrawing || this.points.length < 2) return

        const pos = this.konvaStage.getRelativePointerPosition()
        this.updatePolygonPreview(pos)
    }

    protected mouseUpHandler(e: KonvaEventObject<MouseEvent | TouchEvent>): void {
        // abstract class overrride
    }
    private startDrawing(pos: { x: number; y: number }) {
        this.isDrawing = true
        this.points = [pos.x, pos.y]
        this.startPos = { x: pos.x, y: pos.y }

        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        this.polygon = new Konva.Line({
            points: this.points,
            stroke: this.currentAnnotation.style.color || 'red',
            strokeWidth: this.currentAnnotation.style.strokeWidth || 2,
            opacity: this.currentAnnotation.style.opacity || 1,
            lineJoin: 'round',
            closed: false,
            visible: true
        })

        this.currentShapeGroup.konvaGroup.add(this.polygon)
    }

    private addPoint(pos: { x: number; y: number }) {
        this.points.push(pos.x, pos.y)
        this.polygon.points(this.points)
        // Optimize redraw by using requestAnimationFrame
        requestAnimationFrame(() => this.polygon.getLayer().batchDraw())
    }

    private updatePolygonPreview(pos: { x: number; y: number }) {
        const tempPoints = [...this.points, pos.x, pos.y]
        this.polygon.points(tempPoints)

        requestAnimationFrame(() => this.polygon.getLayer().batchDraw())
    }

    private finalShape() {
        if (!this.isDrawing || this.points.length < 6) return

        console.log(this.points)
        this.polygon.points(this.points)
        this.isDrawing = false
        this.polygon.closed(true)

        // Optimize redraw
        requestAnimationFrame(() => this.polygon.getLayer().batchDraw())

        this.setShapeGroupDone({
            id: this.currentShapeGroup.id,
            color: this.currentAnnotation.style.color,
            contentsObj: { text: '' }
        })
    }
    private globalPointerUpHandler = (e: MouseEvent) => {
        if (e.button !== 0) return // Only handle left mouse button
        // If mouse was released inside the stage, do nothing (mouseleave already handled)
        if (this.konvaStage.getRelativePointerPosition()) return
        // Otherwise, cancel unfinished drawing
        this.cancelDrawing()
    }

    private cancelDrawing = () => {
        if (!this.isDrawing) return

        this.polygon.destroy()
        this.points = []
        this.isDrawing = false
        this.startPos = null
    }

    private isClosingPolygon(pos: { x: number; y: number }) {
        if (!this.startPos) return false
        return Math.hypot(pos.x - this.startPos.x, pos.y - this.startPos.y) <= 20
    }
}
