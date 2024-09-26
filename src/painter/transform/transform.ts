import { Annotation, CircleAnnotation, PDFViewerApplication, TextAnnotation } from 'pdfjs'
import { PdfjsAnnotationType } from '../../const/definitions'
import { CircleDecoder } from './decoder_circle'
import { Decoder } from './decoder'

export class Transform {
    private pdfViewerApplication: PDFViewerApplication
    constructor(pdfViewerApplication: PDFViewerApplication) {
        this.pdfViewerApplication = pdfViewerApplication
    }

    private async getAnnotations(): Promise<Annotation[]> {
        const pdfDocument = this.pdfViewerApplication.pdfDocument
        const pdfViewer = this.pdfViewerApplication.pdfViewer
        const numPages = pdfDocument.numPages
        const annotationsPromises: Promise<any[]>[] = []
        console.log()
        // 处理每一页的注释
        for (let i = 1; i <= numPages; i++) {
            const annotationPromise = pdfDocument.getPage(i).then(page => {
                const _pageViewer = pdfViewer.getPageView(i - 1)
                return page.getAnnotations().then(annotations => {
                    return annotations.map(annotation => ({
                        ...annotation,
                        _pageNumber: i,
                        _pageViewer
                    }))
                })
            })
            annotationsPromises.push(annotationPromise)
        }

        // 等待所有注释的 promise 完成
        const nestedAnnotations = await Promise.all(annotationsPromises)
        return nestedAnnotations.flat()
    }

    public async decode() {
        const allAnnotations = await this.getAnnotations()
        const annotationMap: Map<string, string> = new Map() 
        let decoder: Decoder<Annotation> | null = null
        allAnnotations.forEach(annotation => {
            switch (annotation.annotationType) {
                case PdfjsAnnotationType.CIRCLE:
                    const circleAnnotation: CircleAnnotation = annotation as CircleAnnotation;
                    decoder = new CircleDecoder({
                        pdfViewerApplication: this.pdfViewerApplication,
                        annotation: circleAnnotation
                    })
                    annotationMap.set(annotation.id, decoder.decode())
                    break
            }
        })
        return annotationMap
    }
}

// const freetext: FreeTextAnnotation = {
//     annotationFlags: 4,
//     borderStyle: {
//         width: 0,
//         style: 1,
//         dashArray: [3],
//         horizontalCornerRadius: 0,
//         verticalCornerRadius: 0
//     },
//     color: null,
//     backgroundColor: null,
//     borderColor: null,
//     rotation: 0,
//     contentsObj: {
//         str: '打发地方',
//         dir: 'ltr'
//     },
//     hasAppearance: false,
//     id: '998R',
//     modificationDate: null,
//     rect: [307.97, 618.36, 355.61, 639.49],
//     subtype: 'FreeText',
//     hasOwnCanvas: true,
//     noRotate: false,
//     noHTML: false,
//     titleObj: {
//         str: '',
//         dir: 'ltr'
//     },
//     creationDate: 'D:20240913072740',
//     popupRef: null,
//     annotationType: 3,
//     defaultAppearanceData: {
//         fontSize: 10,
//         fontName: 'Helv',
//         fontColor: {
//             '0': 0,
//             '1': 0,
//             '2': 0
//         }
//     },
//     textContent: ['打发地方'],
//     textPosition: [0, 11.129999999999995],
//     pageNumber: 1
// }

// const highlight: HighlightAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 0,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 87,
//         "1": 184,
//         "2": 253
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "999R",
//     "modificationDate": "D:20240922222922+08'00'",
//     "rect": [
//         80.5159,
//         697.012,
//         363.693,
//         713.08
//     ],
//     "subtype": "Highlight",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922222922+08'00'",
//     "popupRef": "1000R",
//     "annotationType": 9,
//     "quadPoints": [
//         [
//             {
//                 "x": 80.5159,
//                 "y": 713.08
//             }
//         ]
//     ],
//     "pageNumber": 1
// }

// const Square:SquareAnnotation =  {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 0,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 255,
//         "2": 0
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1008R",
//     "modificationDate": "D:20240922222950+08'00'",
//     "rect": [
//         46.3572,
//         564.936,
//         311.422,
//         671.131
//     ],
//     "subtype": "Square",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922222950+08'00'",
//     "popupRef": "1009R",
//     "annotationType": 5,
//     "pageNumber": 1
// }

// const ink: InkAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 10,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 189,
//         "2": 9
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1012R",
//     "modificationDate": "D:20240922222956+08'00'",
//     "rect": [
//         53.3798,
//         372.541,
//         334.392,
//         526.297
//     ],
//     "subtype": "Ink",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922222956+08'00'",
//     "popupRef": "1015R",
//     "annotationType": 15,
//     "inkLists": [
//         [
//             {
//                 "x": 74.7281,
//                 "y": 516.297
//             }
//         ]
//     ],
//     "pageNumber": 1
// }

// const line:LineAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 1,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 0,
//         "2": 0
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1045R",
//     "modificationDate": "D:20240922223049+08'00'",
//     "rect": [
//         383.808,
//         589.498,
//         549.495,
//         649.811
//     ],
//     "subtype": "Line",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922223049+08'00'",
//     "popupRef": "1048R",
//     "annotationType": 4,
//     "lineCoordinates": [
//         386.808,
//         592.498,
//         546.495,
//         646.811
//     ],
//     "lineEndings": [
//         "None",
//         "OpenArrow"
//     ],
//     "pageNumber": 1
// }

// const polygonAnnotation: PolygonAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 1,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 0,
//         "2": 0
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1057R",
//     "modificationDate": "D:20240922223111+08'00'",
//     "rect": [
//         392.292,
//         255.891,
//         512.639,
//         310.583
//     ],
//     "subtype": "Polygon",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922223111+08'00'",
//     "popupRef": "1060R",
//     "annotationType": 7,
//     "vertices": [
//         {
//             "x": 393.292,
//             "y": 309.583
//         },
//         {
//             "x": 511.639,
//             "y": 290.938
//         },
//         {
//             "x": 480.026,
//             "y": 256.891
//         }
//     ],
//     "pageNumber": 1
// }

// const polyLineAnnotation: PolyLineAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 1,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 0,
//         "2": 0
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1065R",
//     "modificationDate": "D:20240922223132+08'00'",
//     "rect": [
//         109.394,
//         211.306,
//         307.559,
//         257.891
//     ],
//     "subtype": "PolyLine",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922223132+08'00'",
//     "popupRef": "1068R",
//     "annotationType": 8,
//     "vertices": [
//         {
//             "x": 163.083,
//             "y": 216.359
//         }
//     ],
//     "lineEndings": [
//         "None",
//         "None"
//     ],
//     "pageNumber": 1
// }

// const text: TextAnnotation = {
//     "annotationFlags": 28,
//     "borderStyle": {
//         "width": 0,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 255,
//         "1": 222,
//         "2": 33
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "非常好的高亮",
//         "dir": "ltr"
//     },
//     "hasAppearance": false,
//     "id": "1139R",
//     "modificationDate": "D:20240924175649+08'00'",
//     "rect": [
//         0,
//         -22,
//         22,
//         0
//     ],
//     "subtype": "Text",
//     "hasOwnCanvas": true,
//     "noRotate": true,
//     "noHTML": false,
//     "inReplyTo": "1131R",
//     "replyType": "R",
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240924175649+08'00'",
//     "popupRef": "1140R",
//     "annotationType": 1,
//     "name": "Comment",
//     "state": null,
//     "stateModel": null,
//     "pageNumber": 1
// }

// const underlineAnnotation: UnderlineAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 0,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 155,
//         "1": 187,
//         "2": 89
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1075R",
//     "modificationDate": "D:20240922223201+08'00'",
//     "rect": [
//         131.277,
//         158.377,
//         268.696,
//         168.447
//     ],
//     "subtype": "Underline",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922223201+08'00'",
//     "popupRef": "1076R",
//     "annotationType": 10,
//     "quadPoints": [
//         [
//             {
//                 "x": 132.277,
//                 "y": 167.447
//             },
//             {
//                 "x": 267.696,
//                 "y": 167.447
//             },
//             {
//                 "x": 132.277,
//                 "y": 159.377
//             },
//             {
//                 "x": 267.696,
//                 "y": 159.377
//             }
//         ]
//     ],
//     "pageNumber": 1
// }

// const strikeOutAnnotation: StrikeOutAnnotation = {
//     "annotationFlags": 4,
//     "borderStyle": {
//         "width": 0,
//         "style": 1,
//         "dashArray": [
//             3
//         ],
//         "horizontalCornerRadius": 0,
//         "verticalCornerRadius": 0
//     },
//     "color": {
//         "0": 252,
//         "1": 112,
//         "2": 152
//     },
//     "backgroundColor": null,
//     "borderColor": null,
//     "rotation": 0,
//     "contentsObj": {
//         "str": "",
//         "dir": "ltr"
//     },
//     "hasAppearance": true,
//     "id": "1080R",
//     "modificationDate": "D:20240922223206+08'00'",
//     "rect": [
//         317.014,
//         316.439,
//         556.121,
//         344.434
//     ],
//     "subtype": "StrikeOut",
//     "hasOwnCanvas": false,
//     "noRotate": false,
//     "noHTML": false,
//     "titleObj": {
//         "str": "不具名用户",
//         "dir": "ltr"
//     },
//     "creationDate": "D:20240922223206+08'00'",
//     "popupRef": "1081R",
//     "annotationType": 12,
//     "quadPoints": [
//         [
//             {
//                 "x": 445.888,
//                 "y": 344.434
//             },
//             {
//                 "x": 556.121,
//                 "y": 344.434
//             },
//             {
//                 "x": 445.888,
//                 "y": 336.364
//             },
//             {
//                 "x": 556.121,
//                 "y": 336.364
//             }
//         ],
//         [
//             {
//                 "x": 317.014,
//                 "y": 334.471
//             },
//             {
//                 "x": 556.121,
//                 "y": 334.471
//             },
//             {
//                 "x": 317.014,
//                 "y": 326.402
//             },
//             {
//                 "x": 556.121,
//                 "y": 326.402
//             }
//         ],
//         [
//             {
//                 "x": 317.014,
//                 "y": 324.509
//             },
//             {
//                 "x": 529.015,
//                 "y": 324.509
//             },
//             {
//                 "x": 317.014,
//                 "y": 316.439
//             },
//             {
//                 "x": 529.015,
//                 "y": 316.439
//             }
//         ]
//     ],
//     "pageNumber": 1
// }
