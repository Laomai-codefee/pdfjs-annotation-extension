import { FreeTextAnnotation } from 'pdfjs'
import { Decoder, IDecoderOptions } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType, PdfjsAnnotationType } from '../../const/definitions'

export class FreeTextDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    public decodePdfAnnotation(annotation: FreeTextAnnotation): IAnnotationStore {
        const color = convertToRGB(annotation.defaultAppearanceData.fontColor);
        const fontSize = annotation.defaultAppearanceData.fontSize;
        const { x, y, width, height } = this.convertRect(
            annotation.rect,
            annotation.pageViewer.viewport.scale,
            annotation.pageViewer.viewport.height
        );
    
        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        });
    
        const text = new Konva.Text({
            x,
            y: y + 2,
            text: annotation.contentsObj.str,
            // width,
            fontSize,
            fill: color,
        });
        
        ghostGroup.add(text);
        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            title: annotation.titleObj.str,
            type: AnnotationType.FREETEXT,
            color: '123', // 这里的 color 应该使用上面的 color 变量
            fontSize,
            pdfjsType: annotation.annotationType,
            pdfjsAnnotation: annotation,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            date: annotation.modificationDate,
            contentsObj: null,
            comments: [],
            readonly: false
        };
    
        return annotationStore;
    }
    
}
