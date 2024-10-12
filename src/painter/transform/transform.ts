import { Annotation, PDFViewerApplication } from 'pdfjs'
import { IAnnotationStore, PdfjsAnnotationType } from '../../const/definitions'
import { CircleDecoder } from './decoder_circle'
import { Decoder } from './decoder'
import { FreeTextDecoder } from './decoder_free_text'
import { HighlightDecoder } from './decoder_highlight'
import { SquareDecoder } from './decoder_square'
import { InkDecoder } from './decoder_ink'
import { LineDecoder } from './decoder_line'
import { PolygonDecoder } from './decoder_polygon'
import { PolylineDecoder } from './decoder_polyline'
import { TextDecoder } from './decoder_text'

const PDFJS_INTERNAL_EDITOR_PREFIX = 'pdfjs_internal_editor_'

export class Transform {
    private pdfViewerApplication: PDFViewerApplication

    constructor(pdfViewerApplication: PDFViewerApplication) {
        this.pdfViewerApplication = pdfViewerApplication
    }

    private async getAnnotations(): Promise<Annotation[]> {
        const pdfDocument = this.pdfViewerApplication.pdfDocument
        const pdfViewer = this.pdfViewerApplication.pdfViewer
        const numPages = pdfDocument.numPages

        const annotationsPromises = Array.from({ length: numPages }, (_, i) =>
            pdfDocument.getPage(i + 1).then(page => {
                const _pageViewer = pdfViewer.getPageView(i)
                return page.getAnnotations().then(annotations =>
                    annotations.map(annotation => ({
                        ...annotation,
                        pageNumber: i + 1,
                        pageViewer: _pageViewer
                    }))
                )
            })
        )

        const nestedAnnotations = await Promise.all(annotationsPromises)
        return nestedAnnotations.flat()
    }

    private decodeAnnotation(annotation: Annotation, allAnnotations: Annotation[]): IAnnotationStore | null {
        const decoderMap: { [key: string]: new (options: any) => Decoder } = {
            [PdfjsAnnotationType.CIRCLE]: CircleDecoder,
            [PdfjsAnnotationType.FREETEXT]: FreeTextDecoder,
            [PdfjsAnnotationType.HIGHLIGHT]: HighlightDecoder,
            [PdfjsAnnotationType.UNDERLINE]: HighlightDecoder,
            [PdfjsAnnotationType.STRIKEOUT]: HighlightDecoder,
            [PdfjsAnnotationType.SQUARE]: SquareDecoder,
            [PdfjsAnnotationType.INK]: InkDecoder,
            [PdfjsAnnotationType.LINE]: LineDecoder,
            [PdfjsAnnotationType.POLYGON]: PolygonDecoder,
            [PdfjsAnnotationType.POLYLINE]: PolylineDecoder,
            [PdfjsAnnotationType.TEXT]: TextDecoder
        }
        const DecoderClass = decoderMap[annotation.annotationType]
        if (DecoderClass) {
            const decoder = new DecoderClass({
                pdfViewerApplication: this.pdfViewerApplication,
                id: annotation.id
            })
            return decoder.decodePdfAnnotation(annotation, allAnnotations)
        }
        return null // 不支持的类型返回 null
    }

    /**
     * 在 pdf store 中 清除原有 pdf 注释
     * @param annotation
     */
    private cleanAnnotationStore(annotation: Annotation) {
        this.pdfViewerApplication?.pdfDocument?.annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${annotation.id}`, {
            deleted: true,
            id: annotation.id,
            pageIndex: annotation.pageNumber - 1
        })
    }

    public async decodePdfAnnotation(): Promise<Map<string, IAnnotationStore>> {
        const allAnnotations = await this.getAnnotations()
        const annotationStoreMap = new Map<string, IAnnotationStore>()
        allAnnotations.forEach(annotation => {
            this.cleanAnnotationStore(annotation)
            const decodedAnnotation = this.decodeAnnotation(annotation, allAnnotations)
            if (decodedAnnotation) {
                annotationStoreMap.set(annotation.id, decodedAnnotation)
            }
        })

        return annotationStoreMap
    }
}
