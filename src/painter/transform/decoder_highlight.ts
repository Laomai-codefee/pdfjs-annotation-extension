import { Annotation, HighlightAnnotation, QuadPoint, StrikeOutAnnotation, UnderlineAnnotation } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType, PdfjsAnnotationType } from '../../const/definitions'

export class HighlightDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    /**
     * 创建高亮形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 高亮形状对象
     */
    private createHighlightShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y,
            width,
            height,
            opacity: 0.5,
            fill: color
        })
    }

    /**
     * 创建下划线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 下划线形状对象
     */
    private createUnderlineShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y: height + y - 1.5,
            width,
            stroke: color,
            strokeWidth: 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    /**
     * 创建删除线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 删除线形状对象
     */
    private createStrikeoutShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y: y + height / 2,
            width,
            stroke: color,
            strokeWidth: 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    public decodePdfAnnotation(annotation: HighlightAnnotation | StrikeOutAnnotation | UnderlineAnnotation, allAnnotations: Annotation[]) {
        const color = convertToRGB(annotation.color);

        const typeMap: { [key: string]: AnnotationType } = {
            [PdfjsAnnotationType.HIGHLIGHT]: AnnotationType.HIGHLIGHT,
            [PdfjsAnnotationType.UNDERLINE]: AnnotationType.UNDERLINE,
            [PdfjsAnnotationType.STRIKEOUT]: AnnotationType.STRIKEOUT,
        };
    
        const type = typeMap[annotation.annotationType] || AnnotationType.HIGHLIGHT; // 默认类型为 HIGHLIGHT
    
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id,
        });
    
        const createShape = (quadPoint: QuadPoint[]) => {
            const { x, y, width, height } = this.convertQuadPoints(quadPoint, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height);
            switch (annotation.annotationType) {
                case PdfjsAnnotationType.HIGHLIGHT:
                    return this.createHighlightShape(x, y, width, height, color);
                case PdfjsAnnotationType.UNDERLINE:
                    return this.createUnderlineShape(x, y, width, height, color);
                case PdfjsAnnotationType.STRIKEOUT:
                    return this.createStrikeoutShape(x, y, width, height, color);
                default:
                    return null;
            }
        };
    
        annotation.quadPoints?.forEach(quadPoint => {
            const shape = createShape(quadPoint);
            if (shape) {
                ghostGroup.add(shape);
            }
        });
    
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            konvaString: ghostGroup.toJSON(),
            konvaClientRect: ghostGroup.getClientRect(),
            title: annotation.titleObj.str,
            type,
            color,
            pdfjsType: annotation.annotationType,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            subtype: annotation.subtype,
            date: annotation.modificationDate,
            contentsObj: {
                text: annotation.contentsObj.str
            },
            comments: this.getComments(annotation, allAnnotations),
            draggable: false,
            resizable: false
        };
    
        ghostGroup.destroy();
        return annotationStore;
    }
}