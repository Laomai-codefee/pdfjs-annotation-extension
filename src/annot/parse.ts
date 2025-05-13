import { PDFArray, PDFDocument, PDFName, PDFPage, PDFRef } from "pdf-lib"
import { IAnnotationStore } from "../const/definitions"

export abstract class AnnotationParser {
    protected annotation: IAnnotationStore
    protected page: PDFPage
    protected pdfDoc: PDFDocument

    constructor(pdfDoc: PDFDocument, page: PDFPage, annotation: IAnnotationStore) {
        this.pdfDoc = pdfDoc
        this.page = page
        this.annotation = annotation
    }

    protected addAnnotationToPage(page: PDFPage, annotRef: PDFRef) {
        const annots = page.node.lookup(PDFName.of('Annots')) as PDFArray | undefined
        if (annots) {
            annots.push(annotRef)
        } else {
            page.node.set(PDFName.of('Annots'), page.doc.context.obj([annotRef]))
        }
    }
    

    abstract parse(): Promise<void>
}
