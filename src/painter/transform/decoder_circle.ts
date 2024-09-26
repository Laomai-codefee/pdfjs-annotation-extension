import { CircleAnnotation } from 'pdfjs'
import { Decoder, IDecoderOptions } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'

export class CircleDecoder extends Decoder<CircleAnnotation> {
    constructor(options: IDecoderOptions<CircleAnnotation>) {
        super(options)
    }

    public decode() {
        let json = ''
        const {x, y, width, height} = this.convertRect(this.annotation)
        
        console.log(this.annotation)

        const ghostGroup  = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: this.annotation.id
        })

        const circle = new Konva.Ellipse({
            radiusX: width/2,
            radiusY: height/2,
            x,
            y,
            strokeScaleEnabled: false,
            stroke: convertToRGB(this.annotation.color)
        })

        ghostGroup.add(circle)

        json = ghostGroup.toJSON()

        ghostGroup.destroy()

        return json
    }
}
