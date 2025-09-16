// src/annot/parse_actual_polyline.ts
import { AnnotationParser } from './parse'
import { PDFName, PDFString, PDFNumber, PDFRawStream } from 'pdf-lib'
import { rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'
import { annotationDefinitions } from '../const/definitions'

export class ActualPolylineParser extends AnnotationParser {
    async parse() {
        try {
            const { annotation, page, pdfDoc } = this
            const context = pdfDoc.context
            const pageHeight = page.getHeight()

            const konvaGroup = JSON.parse(annotation.konvaString)
        
        // Extract Line and Path elements for polyline/cloud annotations (exclude pin stems and anchors)
        const lines = konvaGroup.children.filter((item: any) => 
            (item.className === 'Line' || item.className === 'Path') && 
            !item.attrs.name?.includes('pin-stem') &&
            !item.attrs.name?.includes('temp-polyline') &&
            !item.attrs.name?.includes('pin-anchor')
        )
        
        console.log('Found lines:', lines.length, 'Total children:', konvaGroup.children.length)
        console.log('Filtered elements:', lines.map((c: any) => ({ 
            className: c.className, 
            name: c.attrs?.name,
            hasPoints: !!c.attrs?.points,
            hasData: !!c.attrs?.data,
            points: c.attrs?.points?.slice(0, 8) // Show first 4 coordinate pairs
        })))
        console.log('Annotation ID:', annotation.id, 'Type:', annotation.type)
        
        if (lines.length === 0) {
            console.warn('No main Line or Path elements found for polyline annotation')
            console.log('Available children:', konvaGroup.children.map((c: any) => ({ 
                className: c.className, 
                name: c.attrs?.name,
                hasPoints: !!c.attrs?.points,
                hasData: !!c.attrs?.data
            })))
            return
        }

        const groupX = konvaGroup.attrs.x || 0
        const groupY = konvaGroup.attrs.y || 0
        const scaleX = konvaGroup.attrs.scaleX || 1
        const scaleY = konvaGroup.attrs.scaleY || 1

        // Process the main polyline/cloud (the actual drawn line, not pin stems)
        const mainElement = lines[0]
        let points: number[] = []
        
        // PRIORITY: Always use contentsObj.points first if available (contains edited positions)
        if (annotation.contentsObj?.points && annotation.contentsObj.points.length > 0) {
            points = annotation.contentsObj.points
            console.log('Using points from contentsObj (edited positions):', points.length / 2, 'points')
        } else if (mainElement.className === 'Line') {
            // Fallback: Handle Line elements (regular polylines) - original positions
            points = mainElement.attrs.points || []
            console.log('Using points from Line element (original positions):', points.length / 2, 'points')
        } else if (mainElement.className === 'Path') {
            // Fallback: Handle Path elements (cloud annotations) - extract points from SVG path data
            points = this.parseSvgPathToPoints(mainElement.attrs.data || '')
            console.log('Using points from Path element:', points.length / 2, 'points')
        }
        
        // Additional fallback for cloud annotations
        if (points.length === 0 && annotation.contentsObj?.pathData) {
            // For cloud annotations, try to get path data from contentsObj
            points = this.parseSvgPathToPoints(annotation.contentsObj.pathData)
            console.log('Using pathData from contentsObj:', points.length / 2, 'points')
        }
        
        // Debug: Compare points from different sources
        console.log('=== POINT SOURCE COMPARISON ===')
        console.log('Points from main element:', mainElement.className === 'Line' ? mainElement.attrs.points?.slice(0, 8) : 'N/A (Path element)')
        console.log('Points from contentsObj:', annotation.contentsObj?.points?.slice(0, 8))
        console.log('Final points being used:', points.slice(0, 8))
        console.log('================================')
        
        console.log('Processing element with', points.length / 2, 'points')
        console.log('First few points:', points.slice(0, 8))
        
        if (points.length < 4) {
            console.warn('Insufficient points for polyline:', points.length)
            return
        }
        
        // Transform points to PDF coordinates
        const transformedPoints: number[] = []
        console.log('Transforming points - groupX:', groupX, 'groupY:', groupY, 'scaleX:', scaleX, 'scaleY:', scaleY, 'pageHeight:', pageHeight)
        for (let i = 0; i < points.length; i += 2) {
            const originalX = points[i]
            const originalY = points[i + 1]
            const x = groupX + originalX * scaleX
            const y = pageHeight - (groupY + originalY * scaleY) // Correct Y coordinate transformation
            transformedPoints.push(x, y)
            console.log(`Point ${i/2}: (${originalX}, ${originalY}) -> (${x}, ${y})`)
        }

        // Calculate bounding rectangle from all points
        const minX = Math.min(...transformedPoints.filter((_, i) => i % 2 === 0))
        const maxX = Math.max(...transformedPoints.filter((_, i) => i % 2 === 0))
        const minY = Math.min(...transformedPoints.filter((_, i) => i % 2 === 1))
        const maxY = Math.max(...transformedPoints.filter((_, i) => i % 2 === 1))
        
        const padding = 5 // Add some padding for stroke width
        const rect = [minX - padding, minY - padding, maxX + padding, maxY + padding]
        
        console.log('Final annotation rect:', rect)
        console.log('Transformed points:', transformedPoints.length / 2, 'coordinate pairs')
        console.log('All transformed points:', transformedPoints)
        console.log('First few points:', transformedPoints.slice(0, 8))

        // Get annotation definition for style information
        const annotationDef = annotationDefinitions.find(def => def.type === annotation.type)
        
        // Get style attributes with better fallbacks
        const strokeWidth = mainElement.attrs.strokeWidth ?? annotationDef?.style?.strokeWidth ?? 1
        const opacity = mainElement.attrs.opacity ?? annotationDef?.style?.opacity ?? 1
        
        // Get color from multiple possible sources
        const color = mainElement.attrs.stroke ?? 
                     annotationDef?.style?.color ?? 
                     annotation.color ?? 
                     'rgb(255, 0, 0)'
        const [r, g, b] = rgbToPdfColor(color)
        
        console.log('Style - strokeWidth:', strokeWidth, 'opacity:', opacity, 'color:', color)

        // Determine if this is a cloud annotation (Path element) or regular polyline (Line element)
        const isCloudAnnotation = mainElement.className === 'Path'
        
        let mainAnn: any
        
        if (isCloudAnnotation) {
            // For cloud annotations, use Ink annotation to preserve curved shape
            const inkList = context.obj([context.obj(transformedPoints)])
            
            mainAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Ink'),
                Rect: context.obj(rect),
                InkList: inkList,
                C: context.obj([PDFNumber.of(r), PDFNumber.of(g), PDFNumber.of(b)]),
                T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
                Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
                M: PDFString.of(annotation.date),
                NM: PDFString.of(annotation.id),
                F: PDFNumber.of(4), // Print flag
                Border: context.obj([0, 0, strokeWidth]),
                BS: context.obj({
                    W: PDFNumber.of(strokeWidth),
                    S: PDFName.of('S') // Solid border style
                }),
                CA: PDFNumber.of(opacity)
            })
        } else {
            // For regular polylines, use PolyLine annotation
            const vertices = context.obj(transformedPoints)
            
            // Create appearance stream for better compatibility
            const appearanceDict = this.createPolylineAppearance(
                context, 
                transformedPoints, 
                strokeWidth, 
                [r, g, b], 
                rect
            )

            mainAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('PolyLine'),
                Rect: context.obj(rect),
                Vertices: vertices,
                C: context.obj([PDFNumber.of(r), PDFNumber.of(g), PDFNumber.of(b)]),
                T: stringToPDFHexString(annotation.title || t('normal.unknownUser')),
                Contents: stringToPDFHexString(annotation.contentsObj?.text || ''),
                M: PDFString.of(annotation.date),
                NM: PDFString.of(annotation.id),
                F: PDFNumber.of(4), // Print flag
                Border: context.obj([0, 0, strokeWidth]),
                BS: context.obj({
                    W: PDFNumber.of(strokeWidth),
                    S: PDFName.of('S') // Solid border style
                }),
                CA: PDFNumber.of(opacity),
                AP: appearanceDict, // Add appearance stream
                // Add line ending styles if needed
                LE: context.obj([PDFName.of('None'), PDFName.of('None')])
            })
        }

        const mainAnnRef = context.register(mainAnn)
        this.addAnnotationToPage(page, mainAnnRef)

        // Add comments as text annotations
        for (const comment of annotation.comments || []) {
            const replyAnn = context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Text'),
                Rect: context.obj([rect[0], rect[1], rect[0] + 20, rect[1] + 20]), // Small icon area
                Contents: stringToPDFHexString(comment.content),
                T: stringToPDFHexString(comment.title || t('normal.unknownUser')),
                M: PDFString.of(comment.date),
                C: context.obj([PDFNumber.of(r), PDFNumber.of(g), PDFNumber.of(b)]),
                IRT: mainAnnRef,
                RT: PDFName.of('R'),
                NM: PDFString.of(comment.id),
                Open: false
            })
            const replyAnnRef = context.register(replyAnn)
            this.addAnnotationToPage(page, replyAnnRef)
        }
        } catch (error) {
            console.error('Error parsing polyline annotation:', error)
        }
    }

    private createPolylineAppearance(context: any, points: number[], strokeWidth: number, color: number[], rect: number[]) {
        try {
            // Create appearance stream content
            const width = rect[2] - rect[0]
            const height = rect[3] - rect[1]
            
            // Adjust points relative to the annotation rectangle
            const adjustedPoints = points.map((point, index) => {
                if (index % 2 === 0) {
                    return point - rect[0] // X coordinate
                } else {
                    return point - rect[1] // Y coordinate
                }
            })

            // Build the path drawing commands
            let pathCommands = `${strokeWidth} w\n` // Set line width
            pathCommands += `${color[0]} ${color[1]} ${color[2]} RG\n` // Set stroke color
            
            // Move to first point
            if (adjustedPoints.length >= 2) {
                pathCommands += `${adjustedPoints[0]} ${adjustedPoints[1]} m\n`
                
                // Draw lines to subsequent points
                for (let i = 2; i < adjustedPoints.length; i += 2) {
                    pathCommands += `${adjustedPoints[i]} ${adjustedPoints[i + 1]} l\n`
                }
                
                pathCommands += 'S\n' // Stroke the path
            }

                    const appearanceStreamDict = context.obj({
            Type: PDFName.of('XObject'),
            Subtype: PDFName.of('Form'),
            BBox: context.obj([0, 0, width, height]),
            Length: PDFNumber.of(pathCommands.length),
        })

        // Create PDF stream using PDFRawStream
        const contentStreamBytes = new TextEncoder().encode(pathCommands)
        const appearanceStream = PDFRawStream.of(appearanceStreamDict, contentStreamBytes)
        const appearanceStreamRef = context.register(appearanceStream)

        return context.obj({
            N: appearanceStreamRef
        })
        } catch (error) {
            console.error('Error creating polyline appearance:', error)
            return null
        }
    }

    private parseSvgPathToPoints(data: string): number[] {
        const commands = data.match(/[a-zA-Z][^a-zA-Z]*/g) || []
        const points: number[] = []
        let currentX = 0
        let currentY = 0
        
        for (const cmd of commands) {
            const type = cmd[0]
            const nums = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(parseFloat)

            if (type === 'M') {
                // MoveTo
                if (nums.length >= 2) {
                    currentX = nums[0]
                    currentY = nums[1]
                    points.push(currentX, currentY)
                }
            } else if (type === 'L') {
                // LineTo
                for (let i = 0; i < nums.length; i += 2) {
                    currentX = nums[i]
                    currentY = nums[i + 1]
                    points.push(currentX, currentY)
                }
            } else if (type === 'Q') {
                // Quadratic curve - sample multiple points along the curve
                if (nums.length >= 4) {
                    const controlX = nums[0]
                    const controlY = nums[1]
                    const endX = nums[2]
                    const endY = nums[3]
                    
                    // Sample 5 points along the quadratic curve
                    for (let t = 0.2; t <= 1; t += 0.2) {
                        const x = this.quadraticBezier(currentX, controlX, endX, t)
                        const y = this.quadraticBezier(currentY, controlY, endY, t)
                        points.push(x, y)
                    }
                    
                    currentX = endX
                    currentY = endY
                }
            } else if (type === 'C') {
                // Cubic Bezier - sample multiple points along the curve
                if (nums.length >= 6) {
                    const control1X = nums[0]
                    const control1Y = nums[1]
                    const control2X = nums[2]
                    const control2Y = nums[3]
                    const endX = nums[4]
                    const endY = nums[5]
                    
                    // Sample 8 points along the cubic curve
                    for (let t = 0.125; t <= 1; t += 0.125) {
                        const x = this.cubicBezier(currentX, control1X, control2X, endX, t)
                        const y = this.cubicBezier(currentY, control1Y, control2Y, endY, t)
                        points.push(x, y)
                    }
                    
                    currentX = endX
                    currentY = endY
                }
            } else if (type === 'Z' || type === 'z') {
                // Close path - add the starting point if it's different
                if (points.length > 0) {
                    const startX = points[0]
                    const startY = points[1]
                    if (Math.abs(currentX - startX) > 0.1 || Math.abs(currentY - startY) > 0.1) {
                        points.push(startX, startY)
                    }
                }
            }
        }
        return points
    }

    private quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
        return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2
    }

    private cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
        const u = 1 - t
        return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
    }
}