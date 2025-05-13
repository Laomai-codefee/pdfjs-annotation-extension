import { PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { AnnotationParser } from './parse'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class TextParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const rect = convertKonvaRectToPdfRect(annotation.konvaClientRect, page.getHeight())
        const context = pdfDoc.context

        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Text'),
            Rect: rect,
            NM: PDFHexString.fromText(annotation.id), // 唯一标识
            Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
            Name: PDFName.of('Comment'),
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
            M: PDFString.of(annotation.date),
            C: rgbToPdfColor(annotation.color),
            Open: false
        })
        const mainAnnRef = context.register(mainAnn)
        this.addAnnotationToPage(page, mainAnnRef)

        for (const comment of annotation.comments || []) {
            const replyAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Text'),
                Rect: rect,
                Contents: stringToPDFHexString(comment.content),
                T: stringToPDFHexString(comment.title || t('normal.unknownUser')),
                M: PDFString.of(comment.date),
                C: rgbToPdfColor(annotation.color),
                IRT: mainAnnRef,
                RT: PDFName.of('R'),
                NM: PDFHexString.fromText(comment.id), // 唯一标识
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
    }
}
