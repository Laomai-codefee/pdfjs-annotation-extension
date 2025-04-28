import { PDFViewerApplication } from 'pdfjs';

import { IAnnotationStore } from '../const/definitions';
import { formatTimestamp } from '../utils/utils';

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
    }

    /**
     * 更新指定 ID 的注释
     * @param id - 注释的 ID
     * @param updates - 更新的部分注释数据
     */
    public update(id: string, updates: Partial<IAnnotationStore>) {
        // console.log("AnnotationStoreUpdate", { AnnotationStore: this.annotationStore, id })

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
            this.annotationStore.delete(id)
        } else {
            console.warn(`Annotation with id ${id} not found.`)
        }
    }

}
