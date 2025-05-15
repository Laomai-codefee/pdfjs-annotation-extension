import { AnnotationParser } from './parse'
import { PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class SquareParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const context = pdfDoc.context
        const pageHeight = page.getHeight()

        // 1️⃣ 主批注（方框）
        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Square'),
            Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
            C: rgbToPdfColor(annotation.color), // 边框颜色
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')), // 作者
            Contents: stringToPDFHexString(annotation.contentsObj?.text || ''), // 说明文字
            M: PDFString.of(annotation.date),
            NM: PDFHexString.fromText(annotation.id), // 唯一标识
            Border: [0, 0, 1] // 可选：设置边框样式为实线宽度1
        })
        const mainAnnRef = context.register(mainAnn)
        this.addAnnotationToPage(page, mainAnnRef)

        // 2️⃣ 回复评论（如果有）
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
                NM: PDFHexString.fromText(comment.id),
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
    }
}
