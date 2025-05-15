import { PDFHexString, PDFName, PDFString, PDFNumber, PDFRawStream } from 'pdf-lib'
import { AnnotationParser } from './parse'
import { convertKonvaRectToPdfRect, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

export class StampParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const context = pdfDoc.context

        // 转换坐标
        const [x1, y1, x2, y2] = convertKonvaRectToPdfRect(annotation.konvaClientRect, page.getHeight())

        const pageWidth = page.getWidth()
        const pageHeight = page.getHeight()

        const left = Math.max(0, Math.min(x1, pageWidth))
        const bottom = Math.max(0, Math.min(y1, pageHeight))
        const right = Math.max(left, Math.min(x2, pageWidth))
        const top = Math.max(bottom, Math.min(y2, pageHeight))

        const rect = [PDFNumber.of(left), PDFNumber.of(bottom), PDFNumber.of(right), PDFNumber.of(top)]

        // 嵌入图片
        let apDict = undefined
        if (annotation.contentsObj?.image) {
            // annotation.contentsObj.image 是 base64 png 字符串，格式 'data:image/png;base64,...'
            // 去掉前缀，留纯 base64
            const base64Str = annotation.contentsObj.image.replace(/^data:image\/png;base64,/, '')
            const pngImage = await pdfDoc.embedPng(base64Str)

            const width = pngImage.width
            const height = pngImage.height

            // 创建外观流 Appearance Stream，放图片
            const appearanceStreamDict = context.obj({
                Type: 'XObject',
                Subtype: 'Form',
                BBox: [0, 0, width, height],
                Resources: context.obj({
                    XObject: context.obj({
                        Im1: pngImage.ref
                    })
                })
            })

            // 这里构造流内容（绘制图片）
            // pdf-lib 里没有直接方法，我们自己写绘制指令：
            // q - 保存图形状态
            // w h cm - 变换矩阵，调整坐标系和缩放
            // /Im1 Do - 绘制图片
            // Q - 恢复图形状态

            const contentStream = `q ${width} 0 0 ${height} 0 0 cm /Im1 Do Q`
            const contentStreamBytes = new TextEncoder().encode(contentStream)

            // 创建 PDFStream
            const appearanceStream = PDFRawStream.of(appearanceStreamDict, contentStreamBytes)
            const appearanceStreamRef = context.register(appearanceStream)

            apDict = context.obj({
                N: appearanceStreamRef // 正常状态外观 Normal Appearance
            })
        }

        // 创建 Stamp 注释字典
        const stampAnnDict: any = {
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Stamp'),
            Rect: rect,
            NM: PDFHexString.fromText(annotation.id),
            Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
            M: PDFString.of(annotation.date),
            Open: false
        }

        if (apDict) {
            stampAnnDict.AP = apDict
        }

        const stampAnn = context.obj(stampAnnDict)
        const stampAnnRef = context.register(stampAnn)

        this.addAnnotationToPage(page, stampAnnRef)

        for (const comment of annotation.comments || []) {
            const replyAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Text'),
                Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
                Contents: stringToPDFHexString(comment.content),
                T: stringToPDFHexString(comment.title || t('normal.unknownUser')),
                M: PDFString.of(comment.date),
                IRT: stampAnnRef,
                RT: PDFName.of('R'),
                NM: PDFHexString.fromText(comment.id),
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
    }
}
