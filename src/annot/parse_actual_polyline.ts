// src/annot/parse_actual_polyline.ts
import { AnnotationParser } from './parse'
import { PDFHexString, PDFName, PDFString, PDFNumber, PDFArray, PDFRawStream } from 'pdf-lib'
import { convertKonvaRectToPdfRect, rgbToPdfColor, stringToPDFHexString } from '../utils/utils'
import { t } from 'i18next'
import { annotationDefinitions } from '../const/definitions'

export class ActualPolylineParser extends AnnotationParser {
    async parse() {
        try {
            const { annotation, page, pdfDoc } = this
            const context = pdfDoc.context
            const pageHeight = page.getHeight()

            const konvaGroup = JSON.parse(annotation.konvaString)
        
        // Extract Line elements specifically for polyline annotations (exclude pin stems)
        const lines = konvaGroup.children.filter((item: any) => 
            item.className === 'Line' && 
            !item.attrs.name?.includes('pin-stem') &&
            !item.attrs.name?.includes('temp-polyline')
        )
        
        console.log('Found lines:', lines.length, 'Total children:', konvaGroup.children.length)
        
        if (lines.length === 0) {
            console.warn('No main Line elements found for polyline annotation')
            console.log('Available children:', konvaGroup.children.map((c: any) => ({ 
                className: c.className, 
                name: c.attrs?.name 
            })))
            return
        }

        const groupX = konvaGroup.attrs.x || 0
        const groupY = konvaGroup.attrs.y || 0
        const scaleX = konvaGroup.attrs.scaleX || 1
        const scaleY = konvaGroup.attrs.scaleY || 1

        // Process the main polyline (the actual drawn line, not pin stems)
        const mainLine = lines[0]
        let points = mainLine.attrs.points || []
        
        // Fallback: if no points in line, try to get from contentsObj
        if (points.length === 0 && annotation.contentsObj?.points) {
            points = annotation.contentsObj.points
            console.log('Using points from contentsObj:', points.length / 2, 'points')
        }
        
        console.log('Processing line with', points.length / 2, 'points')
        
        if (points.length < 4) {
            console.warn('Insufficient points for polyline:', points.length)
            return
        }
        
        // Transform points to PDF coordinates
        const transformedPoints: number[] = []
        for (let i = 0; i < points.length; i += 2) {
            const x = groupX + points[i] * scaleX
            const y = pageHeight - (groupY + points[i + 1] * scaleY) // Correct Y coordinate transformation
            transformedPoints.push(x, y)
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
        console.log('First few points:', transformedPoints.slice(0, 8))

        // Get annotation definition for style information
        const annotationDef = annotationDefinitions.find(def => def.type === annotation.type)
        
        // Get style attributes with better fallbacks
        const strokeWidth = mainLine.attrs.strokeWidth ?? annotationDef?.style?.strokeWidth ?? 1
        const opacity = mainLine.attrs.opacity ?? annotationDef?.style?.opacity ?? 1
        
        // Get color from multiple possible sources
        const color = mainLine.attrs.stroke ?? 
                     annotationDef?.style?.color ?? 
                     annotation.color ?? 
                     'rgb(255, 0, 0)'
        const [r, g, b] = rgbToPdfColor(color)
        
        console.log('Style - strokeWidth:', strokeWidth, 'opacity:', opacity, 'color:', color)

        // Create vertices array - PolyLine requires pairs of coordinates
        const vertices = context.obj(transformedPoints)

        // Create appearance stream for better compatibility
        const appearanceDict = this.createPolylineAppearance(
            context, 
            transformedPoints, 
            strokeWidth, 
            [r, g, b], 
            rect
        )

        const mainAnn = context.obj({
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
}