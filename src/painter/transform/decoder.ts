import { Annotation, PDFViewerApplication, QuadPoint } from 'pdfjs'
import { IAnnotationComment, IAnnotationStore, PdfjsAnnotationType } from '../../const/definitions'

export interface IDecoderOptions {
    pdfViewerApplication: PDFViewerApplication
    id: string
}

export abstract class Decoder {
    protected pdfViewerApplication: PDFViewerApplication
    protected id: string

    constructor({ pdfViewerApplication, id }: IDecoderOptions) {
        this.pdfViewerApplication = pdfViewerApplication
        this.id = id
    }

    /**
     * @description pdfjs annotation rect 转为 konva 的 rect
     * @param annotation
     * @returns
     */
    protected convertRect(rect: [number, number, number, number], scale: number, height: number): { x: number; y: number; width: number; height: number } {
        const pageHeight = height / scale
        const [x1, y1, x2, y2] = rect
        const x = x1
        const y = pageHeight - y2
        const width = x2 - x1
        const _height = y2 - y1
        return { x, y, width, height: _height }
    }

    /**
     * @description pdfjs annotation quadPoint 转为 konva 的 rect
     * @param quadPoint  [左上，右上，左下，右下]
     * @param scale
     * @param height
     * @returns
     */
    protected convertQuadPoints(quadPoint: QuadPoint[], scale: number, height: number): { x: number; y: number; width: number; height: number } {
        const pageHeight = height / scale
        const x = quadPoint[0].x
        const y = pageHeight - quadPoint[0].y
        const width = quadPoint[1].x - quadPoint[0].x
        const _height = quadPoint[1].y - quadPoint[3].y
        return { x, y, width, height: _height }
    }

    protected convertPoint(point: { x: number; y: number }, scale: number, height: number): { x: number; y: number } {
        const pageHeight = height / scale
        return { x: point.x, y: pageHeight - point.y }
    }

    protected convertCoordinates(
        coordinates: [number, number, number, number],
        scale: number,
        height: number
    ): { x: number; y: number; x1: number; y1: number } {
        const pageHeight = height / scale;
        const x = coordinates[0];
        const y = pageHeight - coordinates[1];
        const x1 = coordinates[2];
        const y1 = pageHeight - coordinates[3];
        
        return { x, y, x1, y1 };
    }

    protected getComments(annotation: Annotation, allAnnotations: Annotation[]) : IAnnotationComment[]{
        const reply: IAnnotationComment[] = []
        console.log(allAnnotations)
        allAnnotations.forEach((_item) => {
            if(_item.annotationType === PdfjsAnnotationType.TEXT && _item.inReplyTo  === annotation.id) {
                reply.push({
                    id: _item.id,
                    title: _item.titleObj.str,
                    date: _item.modificationDate,
                    content: _item.contentsObj.str
                })
            }
        })
        return reply
    }
    

    public abstract decodePdfAnnotation(annotation: Annotation, allAnnotations: Annotation[]): IAnnotationStore
}
