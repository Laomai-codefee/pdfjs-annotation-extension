import { IAnnotationContent, IAnnotationStore, IPdfjsAnnotationStorage } from '../const/definitions'
import { base64ToImageBitmap } from '../utils/utils'
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
        console.log('%c [ annotationStore ]', 'font-size:13px; background:#6318bc; color:#a75cff;', this.annotationStore)
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
        if (this.annotationStore.has(id)) {
            this.annotationStore.delete(id)
            this.pdfViewerApplication.pdfDocument.annotationStorage.remove(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`)
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

    /**
     * 重置 pdfjs annotationStorage中的ImageBitmap
     */
    public async resetAnnotationStorage(): Promise<void> {
        const annotationStorage = this.pdfViewerApplication.pdfDocument.annotationStorage
        for (const key in annotationStorage._storage) {
            if (key.startsWith(PDFJS_INTERNAL_EDITOR_PREFIX)) {
                annotationStorage.remove(key)
            }
        }
        this.annotationStore.forEach(async (annotation, id) => {
            if (annotation.content && annotation.content.image) {
                // 如果存在 content.image，将其 base64 转换为 ImageBitmap
                annotation.pdfjsAnnotationStorage.bitmap = await base64ToImageBitmap(annotation.content.image)
                annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${annotation.id}`, annotation.pdfjsAnnotationStorage)
            }
        })
    }
}
