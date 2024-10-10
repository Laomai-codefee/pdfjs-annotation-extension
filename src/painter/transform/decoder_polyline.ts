import { Annotation, PolyLineAnnotation, Vertices } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class PolylineDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: PolyLineAnnotation,  allAnnotations: Annotation[]) {
        const color = convertToRGB(annotation.color)
        const width = annotation.borderStyle.width === 1 ? annotation.borderStyle.width + 1 : annotation.borderStyle.width
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })
        const createLine = (vertices: Vertices[]) => {
            const points: number[] = []
            vertices?.forEach(point => {
                const { x, y } = this.convertPoint(point, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
                points.push(x)
                points.push(y)
                
            })
            return new Konva.Line({
                strokeScaleEnabled: false,
                stroke: color,
                strokeWidth: width,
                lineCap: 'round',
                lineJoin: 'round',
                hitStrokeWidth: 20,
                closed: false,
                globalCompositeOperation: 'source-over',
                points
            })
        }
        const line = createLine(annotation.vertices)
        ghostGroup.add(line)
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            konvaClientRect: ghostGroup.getClientRect(),
            title: annotation.titleObj.str,
            type: AnnotationType.FREEHAND,
            color,
            pdfjsType: annotation.annotationType,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            subtype: annotation.subtype,
            date: annotation.modificationDate,
            contentsObj: {
                text: annotation.contentsObj.str
            },
            comments: this.getComments(annotation, allAnnotations),
            readonly: false
        }

        ghostGroup.destroy()
        return annotationStore
    }
}
