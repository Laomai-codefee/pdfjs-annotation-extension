import { Annotation, PDFViewerApplication, QuadPoint } from 'pdfjs'
import { IAnnotationStore } from '../../const/definitions'

export interface IDecoderOptions {
    pdfViewerApplication: PDFViewerApplication
    id: string
}

interface quadPoint {
    x: number,
    y: number
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
    protected convertQuadPoints(quadPoint: QuadPoint[], scale: number, height: number) :{ x: number; y: number; width: number; height: number } {
        const pageHeight = height / scale
        const x = quadPoint[0].x
        const y = pageHeight - quadPoint[0].y
        const width = quadPoint[1].x - quadPoint[0].x
        const _height = quadPoint[1].y - quadPoint[3].y 
        return { x, y, width, height: _height }
    }

    public abstract decodePdfAnnotation(annotation: Annotation): IAnnotationStore
}
