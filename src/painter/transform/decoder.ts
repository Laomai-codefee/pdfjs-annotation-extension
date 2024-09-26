import { Annotation, PDFViewerApplication } from 'pdfjs'

export interface IDecoderOptions<T extends Annotation> {
    pdfViewerApplication: PDFViewerApplication
    annotation: T
}

export abstract class Decoder<T extends Annotation> {
    protected pdfViewerApplication: PDFViewerApplication
    protected annotation: T

    constructor({ pdfViewerApplication, annotation }: IDecoderOptions<T>) {
        this.pdfViewerApplication = pdfViewerApplication
        this.annotation = annotation
    }

    /**
     * @description pdfjs annotation rect 转为 konva 的 rect
     * @param annotation 
     * @returns 
     */
    protected convertRect(annotation: Annotation): { x: number; y: number; width: number; height: number } {
        const {scale, height} = annotation._pageViewer.viewport
        const pageHeight = height / scale
        const [x1, y1, x2, y2] = annotation.rect
        const x = x1
        const y = pageHeight - y2
        const width = x2 - x1
        const _height = y2 - y1
        return { x, y, width, height: _height }
    }

    public abstract decode() :string
}
