import { LineAnnotation } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class LineDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: LineAnnotation) {
        console.log('%c [ annotation ]-14-「transform/decoder_line.ts」', 'font-size:13px; background:#f64196; color:#ff85da;', annotation)

        const color = convertToRGB(annotation.color)
        const width = annotation.borderStyle.width === 1 ? annotation.borderStyle.width + 1 : annotation.borderStyle.width
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })

        const createLine = (points: number[], lineEndings: [string, string]) => {
            // if (lineEndings[1] !== 'None') {
            //     return new Konva.Arrow({
            //         strokeScaleEnabled: false,
            //         fill: color,
            //         stroke: color,
            //         pointerLength: 5,
            //         pointerWidth: 5,
            //         strokeWidth: width,
            //         hitStrokeWidth: 20,
            //         dash: annotation.borderStyle.style === 2 ? annotation.borderStyle.dashArray : [],
            //         globalCompositeOperation: 'source-over',
            //         points
            //     })
            // }
            return new Konva.Line({
                strokeScaleEnabled: false,
                stroke: color,
                strokeWidth: width,
                hitStrokeWidth: 20,
                dash: annotation.borderStyle.style === 2 ? annotation.borderStyle.dashArray : [],
                globalCompositeOperation: 'source-over',
                points
            })
        }

        const { x, y, x1, y1 } = this.convertCoordinates(
            annotation.lineCoordinates,
            annotation.pageViewer.viewport.scale,
            annotation.pageViewer.viewport.height
        )

        console.log(
            '%c [ annotation.lineCoordinates ]-52-「transform/decoder_line.ts」',
            'font-size:13px; background:#8d61a2; color:#d1a5e6;',
            annotation.lineCoordinates
        )

        // console.log('%c [  x, y, x1, y1 ]-51-「transform/decoder_line.ts」', 'font-size:13px; background:#0d94c7; color:#51d8ff;', x, y, x1, y1)

        const line = createLine([x, y, x1, y1], annotation.lineEndings)

        const circle1 = new Konva.Ellipse({
            radiusX: 5,
            radiusY: 5,
            x: x,
            y: y,
            strokeScaleEnabled: false,
            stroke: color
        })

        const circle2 = new Konva.Ellipse({
            radiusX: 5,
            radiusY: 5,
            x: x1,
            y: y1,
            strokeScaleEnabled: false,
            stroke: color
        })

        // console.log('%c [ line ]-60-「transform/decoder_line.ts」', 'font-size:13px; background:#22a753; color:#66eb97;', line)

        ghostGroup.add(line)
        ghostGroup.add(circle1)
        ghostGroup.add(circle2)
        // annotation.inkLists?.forEach(list => {
        //     const points: number[] = list
        //         .map(point => {
        //             const { x, y } = this.convertPoint(point, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
        //             return [x, y]
        //         })
        //         .flat()
        //     const line = createLine(points)
        //     ghostGroup.add(line)
        // })

        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            title: annotation.titleObj.str,
            type: AnnotationType.RECTANGLE,
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
