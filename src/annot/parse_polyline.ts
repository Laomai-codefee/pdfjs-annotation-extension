import { AnnotationParser } from './parse'
import { PDFHexString, PDFName, PDFString, PDFNumber } from 'pdf-lib'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'

function parseSvgPathToPoints(data: string): number[] {
    const commands = data.match(/[a-zA-Z][^a-zA-Z]*/g) || []
    const points: number[] = []
    for (const cmd of commands) {
        const type = cmd[0]
        const nums = cmd
            .slice(1)
            .trim()
            .split(/[\s,]+/)
            .map(parseFloat)

        if (type === 'M' || type === 'L') {
            // MoveTo / LineTo：直接加入坐标
            for (let i = 0; i < nums.length; i += 2) {
                points.push(nums[i], nums[i + 1])
            }
        } else if (type === 'Q') {
            // Quadratic curve：控制点忽略，仅取终点
            if (nums.length >= 4) {
                points.push(nums[2], nums[3])
            }
        } else if (type === 'C') {
            // Cubic Bezier：同理，取终点
            if (nums.length >= 6) {
                points.push(nums[4], nums[5])
            }
        } else if (type === 'Z' || type === 'z') {
            // Close path，忽略
        }
    }
    return points
}

export class PolylineParser extends AnnotationParser {
    async parse() {
        const { annotation, page, pdfDoc } = this
        const context = pdfDoc.context
        const pageHeight = page.getHeight()

        const konvaGroup = JSON.parse(annotation.konvaString)

        const lines = konvaGroup.children.filter((item: any) => item.className === 'Path')

        const groupX = konvaGroup.attrs.x || 0
        const groupY = konvaGroup.attrs.y || 0
        const scaleX = konvaGroup.attrs.scaleX || 1
        const scaleY = konvaGroup.attrs.scaleY || 1

        const inkList = context.obj(
            lines.map((line: any) => {
                const points = parseSvgPathToPoints(line.attrs.data) as number[]
                const transformedPoints: number[] = []

                for (let i = 0; i < points.length; i += 2) {
                    const x = groupX + points[i] * scaleX
                    const y = groupY + points[i + 1] * scaleY
                    transformedPoints.push(x, pageHeight - y)
                }

                return context.obj(transformedPoints)
            })
        )

        const firstLine = lines[0]?.attrs || {}
        const strokeWidth = firstLine.strokeWidth ?? 1
        const opacity = firstLine.opacity ?? 1
        const color = firstLine.stroke ?? annotation.color ?? 'rgb(255, 0, 0)'
        const [r, g, b] = rgbToPdfColor(color)

        const bs = context.obj({
            W: PDFNumber.of(strokeWidth),
            S: PDFName.of('S') // Solid border style
        })

        const mainAnn = context.obj({
            Type: PDFName.of('Annot'),
            Subtype: PDFName.of('Ink'),
            Rect: convertKonvaRectToPdfRect(annotation.konvaClientRect, pageHeight),
            InkList: inkList,
            C: context.obj([PDFNumber.of(r), PDFNumber.of(g), PDFNumber.of(b)]),
            T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
            Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
            M: PDFString.of(annotation.date),
            NM: PDFHexString.fromText(annotation.id),
            Border: context.obj([0, 0, 0]),
            BS: bs,
            CA: PDFNumber.of(opacity) // Non-stroking opacity (used for drawing)
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
                C: context.obj([PDFNumber.of(r), PDFNumber.of(g), PDFNumber.of(b)]),
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
