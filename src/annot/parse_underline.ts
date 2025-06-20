import { AnnotationParser } from './parse'
import { PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class UnderlineParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const context = pdfDoc.context
        const pageHeight = page.getHeight()

        const konvaGroup = JSON.parse(annotation.konvaString)
        const rects = konvaGroup.children.filter((item: any) => item.className === 'Rect')

        const quadPoints: number[] = []

        for (const rect of rects) {
            const { x, y, width, height } = rect.attrs
            const x1 = x
            const y1 = pageHeight - y
            const x2 = x + width
            const y2 = pageHeight - (y + height)

            quadPoints.push(x1, y1, x2, y1, x1, y2, x2, y2)
        }

        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Underline'),
            Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
            QuadPoints: quadPoints,
            C: rgbToPdfColor(annotation.color),
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
            // 这里如果置空，写入的批注中就不会出现内容，和 highlight 不一致
            Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
            M: PDFString.of(annotation.date),
            NM: PDFString.of(annotation.id)
        })
        const mainAnnRef = context.register(mainAnn)
        this.addAnnotationToPage(page, mainAnnRef)

        for (const comment of annotation.comments || []) {
            const replyAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Text'),
                Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
                Contents: stringToPDFHexString(comment.content),
                T: stringToPDFHexString(comment.title || t('normal.unknownUser')),
                M: PDFString.of(comment.date),
                C: rgbToPdfColor(annotation.color),
                IRT: mainAnnRef,
                RT: PDFName.of('R'),
                NM: PDFString.of(comment.id),
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
    }
}
