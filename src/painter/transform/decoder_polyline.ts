import { Annotation, PolyLineAnnotation, InkAnnotation, Vertices } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType } from '../../const/definitions'

export class PolylineDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: PolyLineAnnotation | InkAnnotation, allAnnotations: Annotation[]) {
        console.log('Decoding annotation:', annotation.id, 'Type:', annotation.annotationType, 'Subtype:', annotation.subtype)
        
        const color = convertToRGB(annotation.color)
        const width = annotation.borderStyle.width === 1 ? annotation.borderStyle.width + 1 : annotation.borderStyle.width
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })

        // Handle both PolyLine and Ink annotations
        if (annotation.subtype === 'PolyLine' && 'vertices' in annotation) {
            // Handle PolyLine with Vertices
            const line = this.createLineFromVertices(annotation.vertices, annotation, color, width)
            ghostGroup.add(line)
        } else if (annotation.subtype === 'Ink' && 'inkLists' in annotation) {
            // Handle Ink with InkList - create Path elements for better curve representation
            annotation.inkLists?.forEach(inkList => {
                const points: number[] = inkList
                    .map(point => {
                        const { x, y } = this.convertPoint(point, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
                        return [x, y]
                    })
                    .flat()
                
                // Create a Path element for Ink annotations to better represent curves
                const path = this.createPathFromInkList(points, annotation, color, width)
                ghostGroup.add(path)
            })
        }

        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
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
            draggable: true,
            resizable: true
        }

        ghostGroup.destroy()
        return annotationStore
    }

    private createLineFromVertices(vertices: Vertices[], annotation: any, color: string, width: number) {
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


    private createPathFromInkList(inkList: number[], annotation: any, color: string, width: number) {
        const points: number[] = []
        for (let i = 0; i < inkList.length; i += 2) {
            const { x, y } = this.convertPoint(
                { x: inkList[i], y: inkList[i + 1] }, 
                annotation.pageViewer.viewport.scale, 
                annotation.pageViewer.viewport.height
            )
            points.push(x)
            points.push(y)
        }
        
        // Convert points to SVG path data
        let pathData = ''
        if (points.length >= 2) {
            pathData += `M ${points[0]} ${points[1]} `
            for (let i = 2; i < points.length; i += 2) {
                pathData += `L ${points[i]} ${points[i + 1]} `
            }
        }
        
        return new Konva.Path({
            data: pathData,
            stroke: color,
            strokeWidth: width,
            fillEnabled: false,
            lineCap: 'round',
            lineJoin: 'round',
            hitStrokeWidth: 20,
            globalCompositeOperation: 'source-over'
        })
    }
}