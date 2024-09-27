import { Annotation, CircleAnnotation } from 'pdfjs'
import { Decoder, IDecoderOptions } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType, PdfjsAnnotationType } from '../../const/definitions'

export class CircleDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: CircleAnnotation) {        
        const color = convertToRGB(annotation.color)
        const { x, y, width, height } = this.convertRect(
            annotation.rect,
            annotation.pageViewer.viewport.scale,
            annotation.pageViewer.viewport.height
        )
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })
        const circle = new Konva.Ellipse({
            radiusX: width / 2,
            radiusY: height / 2,
            x: x + width /2,
            y: y + height /2,
            strokeScaleEnabled: false,
            strokeWidth: annotation.borderStyle.width,
            stroke: color,
            dash: annotation.borderStyle.style === 2 ? annotation.borderStyle.dashArray : [],
        })
        ghostGroup.add(circle)
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            title: annotation.titleObj.str,
            type: AnnotationType.CIRCLE,
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
