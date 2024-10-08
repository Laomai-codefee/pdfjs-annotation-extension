import { PDFViewerApplication } from 'pdfjs'

import { IAnnotationContent, IAnnotationStore, IPdfjsAnnotationStorage } from '../const/definitions'
import { base64ToImageBitmap } from '../utils/utils'
import { IShapeGroup } from './editor/editor'

const PDFJS_INTERNAL_EDITOR_PREFIX = 'pdfjs_internal_editor_'

export class Store {
    private annotationStore: Map<string, IAnnotationStore> = new Map()
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

    /**
     * 保存注释到本地存储和 PDF.js
     * @param shapeGroup - 形状组对象
     * @param pdfjsAnnotationStorage - PDF.js 注释存储对象
     * @param annotationContent - 注释内容对象（可选）
     */
    public save(store: IAnnotationStore) {
        // const id = shapeGroup.id
        // const store = {
        //     id,
        //     pageNumber: shapeGroup.pageNumber,
        //     konvaString: shapeGroup.konvaGroup.toJSON(),
        //     type: shapeGroup.annotation.type,
        //     readonly: shapeGroup.annotation.readonly,
        //     pdfjsAnnotationStorage,
        //     content: annotationContent,
        //     time: Date.now()
        // }

        console.log(store)

        this.annotationStore.set(store.id, store)

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
                    time: Date.now()
                }
                this.annotationStore.set(id, updatedAnnotation)

                const storage = this.pdfViewerApplication.pdfDocument.annotationStorage
                if (updates.content?.batchPdfjsAnnotationStorage?.length) {
                    updates.content.batchPdfjsAnnotationStorage.forEach(store => {
                        storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}-${store.pageIndex}`, store)
                    })
                } else {
                    storage.setValue(`${PDFJS_INTERNAL_EDITOR_PREFIX}${id}`, updates.pdfjsAnnotationStorage)
                }
            }
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

    /**
     * 根据页面号获取注释
     * @param pageNumber - 页码
     * @returns 指定页面的注释列表
     */
    public getByPage(pageNumber: number): IAnnotationStore[] {
        // 将 Map 转换为数组，并使用 filter 方法
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
