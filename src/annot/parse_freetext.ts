import { PDFHexString, PDFName, PDFString, PDFNumber } from 'pdf-lib'
import { AnnotationParser } from './parse'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class FreeTextParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const [x1, , , y2] = convertKonvaRectToPdfRect(annotation.konvaClientRect, page.getHeight())
        const context = pdfDoc.context

        const pageWidth = page.getWidth()
        const pageHeight = page.getHeight()

        // 计算图标宽高固定20
        const iconSize = 20

        // 限制 x1、y2 不能小于0，x1+iconSize 不能超过页面宽度，y2 不能超过页面高度
        const xLeft = Math.max(0, Math.min(x1, pageWidth - iconSize))
        const yTop = Math.min(pageHeight, Math.max(y2, iconSize)) // y2 是顶部坐标
        const yBottom = yTop - iconSize

        const rect = [PDFNumber.of(xLeft), PDFNumber.of(yBottom), PDFNumber.of(xLeft + iconSize), PDFNumber.of(yTop)]

        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Caret'),
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
