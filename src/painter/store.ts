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
        console.log(this.annotationStore)
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

    public async resetAnnotationStorage(): Promise<void> {
        // 获取 annotationStorage 对象
        const annotationStorage = this.pdfViewerApplication.pdfDocument.annotationStorage

        // 遍历 annotationStorage 中所有的键
        for (const key in annotationStorage._storage) {
            // 如果键是以 PDFJS_INTERNAL_EDITOR_PREFIX 开头的，则删除它
            if (key.startsWith(PDFJS_INTERNAL_EDITOR_PREFIX)) {
                annotationStorage.remove(key)
            }
        }
        // 使用兼容 ES5 的方式遍历 annotationStore
        this.annotationStore.forEach(async (annotation, id) => {
            if (annotation.content && annotation.content.image) {
                // 如果存在 content.image，将其 base64 转换为 ImageBitmap
                annotation.pdfjsAnnotationStorage.bitmap = await base64ToImageBitmap(annotation.content.image)
                // 重新设置值
                annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${annotation.id}`, annotation.pdfjsAnnotationStorage)
            }
        })
    }
}
