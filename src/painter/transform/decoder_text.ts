import { Annotation, TextAnnotation } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class TextDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: TextAnnotation, allAnnotations: Annotation[]) {
        if (annotation.inReplyTo) return null
        console.log('%c [ annotation ]-14-「transform/decoder_text.ts」', 'font-size:13px; background:#30a495; color:#74e8d9;', annotation)

        const color = convertToRGB(annotation.color)
        const { x, y, width, height } = this.convertRect(annotation.rect, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
        console.log('%c [  x, y, width, height ]-19-「transform/decoder_text.ts」', 'font-size:13px; background:#47a357; color:#8be79b;', x, y, width, height)
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })

        const star = new Konva.Star({
            x: x + width / 3,
            y: y + height / 3,
            numPoints: 5,
            innerRadius: width / 6,
            outerRadius: width / 3,
            fill: 'yellow',
            stroke: 'black',
            strokeWidth: 1
        })
        ghostGroup.add(star)
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            konvaString: ghostGroup.toJSON(),
            konvaClientRect: ghostGroup.getClientRect(),
            title: annotation.titleObj.str,
            type: AnnotationType.FREE_HIGHLIGHT,
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
