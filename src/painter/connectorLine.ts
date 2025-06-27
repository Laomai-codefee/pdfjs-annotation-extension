import { IRect } from 'konva/lib/types'
import { IAnnotationStore } from '../const/definitions'
import { PAINTER_WRAPPER_PREFIX } from './const'
import { defaultOptions } from '../const/default_options'

export class ConnectorLine {
    private connectionPathElement: SVGPathElement | null = null

    constructor({}: {}) {}

    /**
     * @description 计算批注图形的位置
     * @param annotation
     * @param selectorRect
     * @returns
     */
    private calculateShapeRect(annotation: IAnnotationStore, selectorRect: IRect): IRect {
        const wrapperId = `${PAINTER_WRAPPER_PREFIX}_page_${annotation.pageNumber}`
        const konvaContainer = document.querySelector(`#${wrapperId} .konvajs-content`) as HTMLElement
        const containerRect = konvaContainer?.getBoundingClientRect?.()

        const scaleX = 1
        const scaleY = 1

        const realX = selectorRect.x * scaleX + containerRect.left
        const realY = selectorRect.y * scaleY + containerRect.top

        return {
            x: realX,
            y: realY,
            width: selectorRect.width,
            height: selectorRect.height
        }
    }

    private calculateAnnotationRect(annotation: IAnnotationStore): IRect {
        const annotationNode = document.getElementById(`annotation-${annotation.id}`) as HTMLDivElement

        const annotationRect = annotationNode.getBoundingClientRect()

        return {
            x: annotationRect.x,
            y: annotationRect.y,
            width: annotationRect.width,
            height: annotationRect.height
        }
    }

    /**
     * @description 根据图形右侧和批注左侧绘制带弯折的连接线（L 型）
     */
    private calculateConnectionPath(shapeRect: IRect, annotationRect: IRect): string {
        const shapeRightX = shapeRect.x + shapeRect.width
        const shapeCenterY = shapeRect.y + shapeRect.height / 2

        const annotationLeftX = annotationRect.x
        const annotationCenterY = annotationRect.y + 10

        const bendX = (shapeRightX + annotationLeftX) / 2

        return `
            M ${shapeRightX} ${shapeCenterY}
            L ${bendX} ${shapeCenterY}
            L ${bendX} ${annotationCenterY}
            L ${annotationLeftX} ${annotationCenterY}
        `.trim()
    }

    /**
     * @description 创建箭头
     * @param svg
     */
    private createArrowMarkerDefs(svg: SVGSVGElement) {
        const svgNS = 'http://www.w3.org/2000/svg'

        const defs = document.createElementNS(svgNS, 'defs')

        const marker = document.createElementNS(svgNS, 'marker')
        marker.setAttribute('id', 'arrow')
        marker.setAttribute('viewBox', '0 0 10 10')
        marker.setAttribute('refX', '0') // 改为起点对齐
        marker.setAttribute('refY', '5')
        marker.setAttribute('markerWidth', '6')
        marker.setAttribute('markerHeight', '6')
        marker.setAttribute('orient', 'auto')

        const path = document.createElementNS(svgNS, 'path')
        path.setAttribute('d', 'M 10 0 L 0 5 L 10 10 z') // 箭头朝左
        path.setAttribute('fill', defaultOptions.connectorLine.COLOR)

        marker.appendChild(path)
        defs.appendChild(marker)

        svg.appendChild(defs)
    }

    /**
     * @description 只触发动画（用于首次显示）
     */
    private animateLine() {
        if (this.connectionPathElement) {
            this.connectionPathElement.style.strokeDashoffset = '0'
        }
    }

    private shouldDrawBasedOnDistance(shapeRect: IRect, annotationRect: IRect, minDistance = 30): boolean {
        const shapeRightX = shapeRect.x + shapeRect.width
        const annotationLeftX = annotationRect.x

        return annotationLeftX - shapeRightX > minDistance
    }

    private shouldDrawBasedOnScreen(minWidth = 768): boolean {
        return window.innerWidth > minWidth
    }

    public drawConnection(annotation: IAnnotationStore, selectorRect: IRect) {
        this.clearConnection()
        requestAnimationFrame(() => {
            if (!this.shouldDrawBasedOnScreen()) return

            const shapeRect = this.calculateShapeRect(annotation, selectorRect)
            const annotationRect = this.calculateAnnotationRect(annotation)

            if (!this.shouldDrawBasedOnDistance(shapeRect, annotationRect)) return

            const pathData = this.calculateConnectionPath(shapeRect, annotationRect)

            const svgNS = 'http://www.w3.org/2000/svg'

            if (!this.connectionPathElement) {
                const svg = document.createElementNS(svgNS, 'svg')
                const path = document.createElementNS(svgNS, 'path')

                path.setAttribute('d', pathData)
                const length = path.getTotalLength()

                // 样式设置
                path.setAttribute('stroke', defaultOptions.connectorLine.COLOR)
                path.setAttribute('stroke-width', `${defaultOptions.connectorLine.WIDTH}`)
                path.setAttribute('fill', 'none')
                path.setAttribute('stroke-linecap', 'round')
                path.setAttribute('opacity', `${defaultOptions.connectorLine.OPACITY}`)
                path.setAttribute('stroke-dasharray', `${length}`)
                path.setAttribute('stroke-dashoffset', `${length}`)
                path.setAttribute('marker-start', 'url(#arrow)') // 👈 添加箭头
                path.style.transition = 'stroke-dashoffset 0.5s ease-in-out'
                path.style.transform = 'translateZ(0)'

                // 添加 marker 到 defs
                this.createArrowMarkerDefs(svg)

                svg.appendChild(path)
                svg.style.position = 'absolute'
                svg.style.top = '0'
                svg.style.left = '0'
                svg.style.width = '100vw'
                svg.style.height = '100vh'
                svg.style.pointerEvents = 'none'
                svg.style.zIndex = '98'
                svg.id = 'connector-svg'

                this.connectionPathElement = path

                document.body.appendChild(svg)
                this.animateLine()
            } else {
                this.connectionPathElement.setAttribute('d', pathData)
                const length = this.connectionPathElement.getTotalLength()
                this.connectionPathElement.setAttribute('stroke-dasharray', `${length}`)
                this.connectionPathElement.setAttribute('stroke-dashoffset', `${length}`)
                this.connectionPathElement.style.strokeDashoffset = '0'
            }
        })
    }

    /**
     * @description 移除连接线
     */
    public clearConnection() {
        const svgContainer = document.getElementById('connector-svg')
        if (svgContainer) {
            svgContainer.remove() // 从 DOM 删除
        }
        this.connectionPathElement = null // 清空引用
    }
}
