import { IAnnotationContent, IAnnotationStore, IPdfjsAnnotationStorage } from '../types/definitions'
import { IShapeGroup } from './editor/editor'
import { PDFViewerApplication } from 'pdfjs'

const PDFJS_INTERNAL_EDITOR_PREFIX = 'pdfjs_internal_editor_'

export class Store {
    private annotationStore: Map<string, IAnnotationStore> = new Map()
    private pdfViewerApplication: PDFViewerApplication
    constructor({ PDFViewerApplication }: { PDFViewerApplication: PDFViewerApplication }) {
        this.pdfViewerApplication = PDFViewerApplication
    }

    get annotation() {
        return (id: string) => {
            return this.annotationStore.get(id)
        }
    }

    public save(shapeGroup: IShapeGroup, pdfjsAnnotationStorage: IPdfjsAnnotationStorage, annotationContent?: IAnnotationContent) {
        const id = shapeGroup.id
        this.pdfViewerApplication.pdfDocument.annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, pdfjsAnnotationStorage)
        this.annotationStore.set(id, {
            id,
            pageNumber: shapeGroup.pageNumber,
            konvaString: shapeGroup.konvaGroup.toJSON(),
            type: shapeGroup.annotation.type,
            readonly: shapeGroup.annotation.readonly,
            pdfjsAnnotationStorage,
            content: annotationContent,
            time: new Date().getTime()
        })
    }

    public update(id: string, updates: Partial<IAnnotationStore>) {
        if (this.annotationStore.has(id)) {
            const existingAnnotation = this.annotationStore.get(id)
            if (existingAnnotation) {
                const updatedAnnotation = {
                    ...existingAnnotation,
                    ...updates,
                    time: new Date().getTime()
                }
                this.annotationStore.set(id, updatedAnnotation)
                this.pdfViewerApplication.pdfDocument.annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, updates.pdfjsAnnotationStorage)
            }
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

    public getByPage(pageNumber: number): IAnnotationStore[] {
        const annotations: IAnnotationStore[] = []
        this.annotationStore.forEach(annotation => {
            if (annotation.pageNumber === pageNumber) {
                annotations.push(annotation)
            }
        })
        return annotations
    }

    /**
     * 删除指定 ID 的注释。
     * @param id - 要删除的注释的 ID。
     */
    public delete(id: string): void {
        // 检查注释是否存在
        if (this.annotationStore.has(id)) {
            // 从 annotationStore 中删除注释
            this.annotationStore.delete(id)

            // 从 pdfjsAnnotationStorage 中删除与该注释关联的值
            this.pdfViewerApplication.pdfDocument.annotationStorage.remove(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`)

            console.log(`Annotation with id ${id} deleted.`)
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }
}
