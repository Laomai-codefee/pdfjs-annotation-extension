import Konva from 'konva'

export function createDocumentIcon({
    x,
    y,
    fill = 'rgb(255, 222, 33)',
    stroke = '#000',
    strokeWidth = 1,
    cornerSize = 3
}: {
    x: number
    y: number
    fill?: string
    stroke?: string
    strokeWidth?: number
    cornerSize?: number
}) {
    const width = 16
    const height = 16
    const paddingTop = 4
    const paddingBottom = 4
    const textLineCount = 4
    const spacing = (height - paddingTop - paddingBottom) / (textLineCount + 1)

    // 主体矩形带阴影和渐变
    const rect = new Konva.Rect({
        x,
        y,
        width,
        height,
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 0, y: height },
        fillLinearGradientColorStops: [0, fill, 1, '#fff'],
        stroke,
        cornerRadius: [0, cornerSize, 0, 0],
        strokeWidth,
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowBlur: 2,
        shadowOffset: { x: 1, y: 1 },
        shadowOpacity: 0.3
    })

    // 模拟文字的横线
    const lines = []
    for (let i = 1; i <= textLineCount; i++) {
        const yPos = y + paddingTop + i * spacing
        const xEnd = i === 1 ? x + width - 6 : x + width - 3 // 第一行略短
        const line = new Konva.Line({
            points: [x + 3, yPos, xEnd, yPos],
            stroke: '#555',
            strokeWidth: 0.6,
            lineCap: 'round'
        })
        lines.push(line)
    }

    return [rect, ...lines]
}
