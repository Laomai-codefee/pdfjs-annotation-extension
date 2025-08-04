import { AnnotationParser } from './parse'
import { PDFHexString, PDFName, PDFString } from 'pdf-lib'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class HighlightParser extends AnnotationParser {
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

            // QuadPoints: 每个矩形有 4 个点（左上、右上、左下、右下）
            quadPoints.push(
                x1, y1, // 左上
                x2, y1, // 右上
                x1, y2, // 左下
                x2, y2  // 右下
            )
        }

        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Highlight'),
            Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
            QuadPoints: quadPoints,
            C: rgbToPdfColor(annotation.color), // 批注颜色
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')), // 作者
            Contents: stringToPDFHexString(''), // 主内容
            M: PDFString.of(annotation.date || ''), // 日期
            NM: PDFString.of(annotation.id), // 唯一标识
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
                M: PDFString.of(comment.date || ''),
                C: rgbToPdfColor(annotation.color),
                IRT: mainAnnRef,
                RT: PDFName.of('R'),
                NM: PDFString.of(comment.id), // 唯一标识
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
    }
}
