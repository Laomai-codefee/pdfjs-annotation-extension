import { KonvaEventObject } from 'konva/lib/Node'
import { AnnotationType, IAnnotationStore, IAnnotationStyle } from '../../const/definitions'
import { Editor, IEditorOptions } from './editor'
import { createDocumentIcon } from '../../utils/documentIcon'
export class EditorNote extends Editor {
    constructor(EditorOptions: IEditorOptions) {
        super({ ...EditorOptions, editorType: AnnotationType.NOTE })
    }

    protected mouseDownHandler() {}
    protected mouseMoveHandler() {}

    protected async mouseUpHandler(e: KonvaEventObject<PointerEvent>) {
        const color = 'rgb(255, 222, 33)'
        const { x, y } = this.konvaStage.getRelativePointerPosition()
        if (e.currentTarget !== this.konvaStage) {
            return
        }
        this.isPainting = true
        this.currentShapeGroup = this.createShapeGroup()
        this.getBgLayer().add(this.currentShapeGroup.konvaGroup)

        const docIcon = createDocumentIcon({ x, y, fill: color })

        this.currentShapeGroup.konvaGroup.add(...docIcon)
        const id = this.currentShapeGroup.konvaGroup.id()
        this.setShapeGroupDone({
            id,
            contentsObj: {
                text: ''
            },
            color
        })
    }

    protected changeStyle(): void {}
}
