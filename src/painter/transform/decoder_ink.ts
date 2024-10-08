import { InkAnnotation } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class InkDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: InkAnnotation) {
        const color = convertToRGB(annotation.color)
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })

        const createLine = (points: number[]) => {
            return new Konva.Line({
                strokeScaleEnabled: false,
                stroke: color,
                strokeWidth: annotation.borderStyle.width,
                opacity: 0.5,
                lineCap: 'round',
                lineJoin: 'round',
                hitStrokeWidth: 20,
                globalCompositeOperation: 'source-over',
                points
            })
        }

        annotation.inkLists?.forEach(list => {
            const points: number[] = list
                .map(point => {
                    const { x, y } = this.convertPoint(point, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
                    return [x, y]
                })
                .flat()
            const line = createLine(points)
            ghostGroup.add(line)
        })

        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            title: annotation.titleObj.str,
            type: AnnotationType.FREEHAND,
            color,
            pdfjsType: annotation.annotationType,
            pdfjsAnnotation: annotation,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            date: annotation.modificationDate,
            contentsObj: null,
            comments: [],
            readonly: false
        }
        ghostGroup.destroy()
        return annotationStore
    }
}
