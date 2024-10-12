import { PDFViewerApplication } from 'pdfjs'

import { IAnnotationStore } from '../const/definitions'
import { base64ToImageBitmap, formatTimestamp } from '../utils/utils'

const PDFJS_INTERNAL_EDITOR_PREFIX = 'pdfjs_internal_editor_'

export class Store {
    // 所有注释
    private annotationStore: Map<string, IAnnotationStore> = new Map()
    // 原有注释
    private originalAnnotationStore: Map<string, IAnnotationStore> = new Map()
    private pdfViewerApplication: PDFViewerApplication

    constructor({ PDFViewerApplication }: { PDFViewerApplication: PDFViewerApplication }) {
        this.pdfViewerApplication = PDFViewerApplication
    }

    /**
     * 获取指定 ID 的注释
     * @param id - 注释的 ID
     * @returns 注释对象，如果存在则返回，否则返回 undefined
     */
    get annotation() {
        return (id: string) => this.annotationStore.get(id)
    }

    get annotaions() {
        return Array.from(this.annotationStore.values());
    }

    /**
     * 保存注释
     * @param store  
     * @param isOriginal  是否是原有注释
     */
    public save(store: IAnnotationStore, isOriginal: boolean) {
        this.annotationStore.set(store.id, store)
        if(isOriginal) {
            this.originalAnnotationStore.set(store.id, store)
        }
        return store

        // const storage = this.pdfViewerApplication.pdfDocument.annotationStorage
        // if (annotationContent?.batchPdfjsAnnotationStorage?.length) {
        //     annotationContent.batchPdfjsAnnotationStorage.forEach(store => {
        //         storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}-${store.pageIndex}`, store)
        //     })
        // } else {
        //     storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, pdfjsAnnotationStorage)
        // }

        // console.log('%c [ annotationStore ]', 'font-size:13px; background:#6318bc; color:#a75cff;', this.annotationStore)
    }

    /**
     * 更新指定 ID 的注释
     * @param id - 注释的 ID
     * @param updates - 更新的部分注释数据
     */
    public update(id: string, updates: Partial<IAnnotationStore>) {
        if (this.annotationStore.has(id)) {
            const existingAnnotation = this.annotationStore.get(id)
            if (existingAnnotation) {
                const updatedAnnotation = {
                    ...existingAnnotation,
                    ...updates,
                    date: formatTimestamp(Date.now())
                }
                this.annotationStore.set(id, updatedAnnotation)
                console.log('%c [ this.annotationStore ]-67-「painter/store.ts」', 'font-size:13px; background:#f57a85; color:#ffbec9;', this.annotationStore)
                return updatedAnnotation
                // const storage = this.pdfViewerApplication.pdfDocument.annotationStorage
                // if (updates.content?.batchPdfjsAnnotationStorage?.length) {
                //     updates.content.batchPdfjsAnnotationStorage.forEach(store => {
                //         storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}-${store.pageIndex}`, store)
                //     })
                // } else {
                //     storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, updates.pdfjsAnnotationStorage)
                // }
            }
        } else {
            console.warn(`Annotation with id ${id} not found.`)
            return null
        }
    }

    /**
     * 根据页面号获取注释
     * @param pageNumber - 页码
     * @returns 指定页面的注释列表
     */
    public getByPage(pageNumber: number): IAnnotationStore[] {
        return Array.from(this.annotationStore.values()).filter(annotation => annotation.pageNumber === pageNumber)
    }

    /**
     * 删除指定 ID 的注释
     * @param id - 要删除的注释的 ID
     */
    public delete(id: string): void {
        if (this.annotationStore.has(id)) {
            const batchPdfjsAnnotationStorage = this.annotationStore.get(id)?.content?.batchPdfjsAnnotationStorage
            this.annotationStore.delete(id)

            const storage = this.pdfViewerApplication.pdfDocument.annotationStorage
            storage.remove(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`)
            if (batchPdfjsAnnotationStorage?.length) {
                batchPdfjsAnnotationStorage.forEach(store => {
                    storage.remove(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}-${store.pageIndex}`)
                })
            }
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

    /**
     * 重置 PDF.js 注释存储中的 ImageBitmap
     * 将存储中的 Base64 图片转换为 ImageBitmap 并更新存储
     */
    public async resetAnnotationStorage(): Promise<void> {
        const annotationStorage = this.pdfViewerApplication.pdfDocument.annotationStorage

        // 删除内部编辑器的所有注释
        for (const key in annotationStorage._storage) {
            if (key.startsWith(PDFJS_INTERNAL_EDITOR_PREFIX)) {
                annotationStorage.remove(key)
            }
        }

        // 更新存储中的 ImageBitmap
        const entries = Array.from(this.annotationStore.entries())
        for (const [id, annotation] of entries) {
            if (annotation.content?.image) {
                const batchPdfjsAnnotationStorage = annotation.content.batchPdfjsAnnotationStorage
                if (batchPdfjsAnnotationStorage?.length) {
                    for (const store of batchPdfjsAnnotationStorage) {
                        const bitmap = await base64ToImageBitmap(annotation.content.image)
                        store.bitmap = bitmap
                        annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}-${store.pageIndex}`, store)
                    }
                } else {
                    const bitmap = await base64ToImageBitmap(annotation.content.image)
                    annotation.pdfjsAnnotationStorage.bitmap = bitmap
                    annotationStorage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, annotation.pdfjsAnnotationStorage)
                }
            }
        }
    }

}
