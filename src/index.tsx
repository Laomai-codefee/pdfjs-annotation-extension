import './scss/app.scss'

import { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeI18n } from './locale/index'
import { SyncOutlined } from '@ant-design/icons';
import i18n, { t } from 'i18next'
import { CustomPopbar, CustomPopbarRef } from './components/popbar'
import { CustomToolbar, CustomToolbarRef } from './components/toolbar'
import { annotationDefinitions, HASH_PARAMS_DEFAULT_EDITOR_ACTIVE, HASH_PARAMS_DEFAULT_SIDEBAR_OPEN, HASH_PARAMS_GET_URL, HASH_PARAMS_POST_URL, HASH_PARAMS_USERNAME } from './const/definitions'
import { Painter } from './painter'
import { CustomComment, CustomCommentRef } from './components/comment'
import { once, parseQueryString, hashArrayOfObjects } from './utils/utils'
import { defaultOptions } from './const/default_options'
import { exportAnnotationsToExcel, exportAnnotationsToPdf } from './annot'
import { Modal, Space, message } from 'antd'
import { CustomAnnotationMenu, CustomAnnotationMenuRef } from './components/menu'
import { ConnectorLine } from './painter/connectorLine'

interface AppOptions {
    [key: string]: string;
}

class PdfjsAnnotationExtension {
    PDFJS_PDFViewerApplication: PDFViewerApplication // PDF.js 的 PDFViewerApplication 对象
    PDFJS_EventBus: EventBus // PDF.js 的 EventBus 对象
    $PDFJS_outerContainer: HTMLDivElement
    $PDFJS_mainContainer: HTMLDivElement
    $PDFJS_sidebarContainer: HTMLDivElement // PDF.js 侧边栏容器
    $PDFJS_toolbar_container: HTMLDivElement // PDF.js 工具栏容器
    $PDFJS_viewerContainer: HTMLDivElement // PDF.js 页面视图容器
    customToolbarRef: React.RefObject<CustomToolbarRef> // 自定义工具栏的引用
    customPopbarRef: React.RefObject<CustomPopbarRef>
    customerAnnotationMenuRef: React.RefObject<CustomAnnotationMenuRef> // 自定义批注菜单的引用
    customCommentRef: React.RefObject<CustomCommentRef>
    painter: Painter // 画笔实例
    appOptions: AppOptions
    loadEnd: Boolean
    initialDataHash: number
    _connectorLine: ConnectorLine | null = null

    constructor() {
        this.loadEnd = false
        this.initialDataHash = null
        // 初始化 PDF.js 对象和相关属性
        this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
        this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
        this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
        this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
        this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
        this.$PDFJS_mainContainer = this.PDFJS_PDFViewerApplication.appConfig.mainContainer
        this.$PDFJS_outerContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.outerContainer
        // 使用 createRef 方法创建 React 引用
        this.customToolbarRef = createRef<CustomToolbarRef>()
        this.customPopbarRef = createRef<CustomPopbarRef>()
        this.customerAnnotationMenuRef = createRef<CustomAnnotationMenuRef>()
        this.customCommentRef = createRef<CustomCommentRef>()
        // 加载多语言
        initializeI18n(this.PDFJS_PDFViewerApplication.l10n.getLanguage())

        // 设置 appOptions 的默认值
        this.appOptions = {
            [HASH_PARAMS_USERNAME]: i18n.t('normal.unknownUser'), // 默认用户名
            [HASH_PARAMS_GET_URL]: '', // 默认 GET URL
            [HASH_PARAMS_POST_URL]: '', // 默认 POST URL
            [HASH_PARAMS_DEFAULT_EDITOR_ACTIVE]: null,
            [HASH_PARAMS_DEFAULT_SIDEBAR_OPEN]: 'true'
        };

        // 处理地址栏参数
        this.parseHashParams()
        // 创建画笔实例
        this.painter = new Painter({
            userName: this.getOption(HASH_PARAMS_USERNAME),
            PDFViewerApplication: this.PDFJS_PDFViewerApplication,
            PDFJS_EventBus: this.PDFJS_EventBus,
            setDefaultMode: () => {
                this.customToolbarRef.current.activeAnnotation(annotationDefinitions[0])
            },
            onWebSelectionSelected: range => {
                this.customPopbarRef.current.open(range)
            },
            onStoreAdd: (annotation, isOriginal, currentAnnotation) => {
                this.customCommentRef.current.addAnnotation(annotation)
                if (isOriginal) return
                if (currentAnnotation.isOnce) {
                    this.painter.selectAnnotation(annotation.id)
                }
                if (this.isCommentOpen()) {
                    // 如果评论栏已打开，则选中批注
                    this.customCommentRef.current.selectedAnnotation(annotation, true)
                }
            },
            onStoreDelete: (id) => {
                this.customCommentRef.current.delAnnotation(id)
            },
            onAnnotationSelected: (annotation, isClick, selectorRect) => {
                this.customerAnnotationMenuRef.current.open(annotation, selectorRect)
                if (isClick && this.isCommentOpen()) {
                    // 如果是点击事件并且评论栏已打开，则选中批注
                    this.customCommentRef.current.selectedAnnotation(annotation, isClick)
                }

                this.connectorLine?.drawConnection(annotation, selectorRect)
            },
            onAnnotationChange: (annotation) => {
                this.customCommentRef.current.updateAnnotation(annotation)
            },
            onAnnotationChanging: () => {
                this.connectorLine?.clearConnection()
                this.customerAnnotationMenuRef?.current?.close()
            },
            onAnnotationChanged: (annotation, selectorRect) => {
                console.log('annotation changed', annotation)
                this.connectorLine?.drawConnection(annotation, selectorRect)
                this.customerAnnotationMenuRef?.current?.open(annotation, selectorRect)
            },
        })
        // 初始化操作
        this.init()
    }

    get connectorLine(): ConnectorLine | null {
        if (defaultOptions.connectorLine.ENABLED) {
            this._connectorLine = new ConnectorLine({})
        }
        return this._connectorLine
    }

    /**
     * @description 初始化 PdfjsAnnotationExtension 类
     */
    private init(): void {
        this.addCustomStyle()
        this.bindPdfjsEvents()
        this.renderToolbar()
        this.renderPopBar()
        this.renderAnnotationMenu()
        this.renderComment()
    }

    /**
     * @description 处理地址栏参数
     * @returns 
     */
    private parseHashParams() {
        const hash = document.location.hash.substring(1);
        if (!hash) {
            console.warn(`HASH_PARAMS is undefined`);
            return;
        }
        const params = parseQueryString(hash);
        if (params.has(HASH_PARAMS_USERNAME)) {
            this.setOption(HASH_PARAMS_USERNAME, params.get(HASH_PARAMS_USERNAME))
        } else {
            console.warn(`${HASH_PARAMS_USERNAME} is undefined`);
        }
        if (params.has(HASH_PARAMS_GET_URL)) {
            this.setOption(HASH_PARAMS_GET_URL, params.get(HASH_PARAMS_GET_URL))
        } else {
            console.warn(`${HASH_PARAMS_GET_URL} is undefined`);
        }
        if (params.has(HASH_PARAMS_POST_URL)) {
            this.setOption(HASH_PARAMS_POST_URL, params.get(HASH_PARAMS_POST_URL))
        } else {
            console.warn(`${HASH_PARAMS_POST_URL} is undefined`);
        }
        if (params.has(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE) && params.get(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE) === 'true') {
            this.setOption(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE, 'select')
        } else {
            console.warn(`${HASH_PARAMS_DEFAULT_EDITOR_ACTIVE} is undefined`);
        }

        if (params.has(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) && params.get(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) === 'false') {
            this.setOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN, 'false')
        } else {
            console.warn(`${HASH_PARAMS_DEFAULT_EDITOR_ACTIVE} is undefined`);
        }

    }

    private setOption(name: string, value: string) {
        this.appOptions[name] = value
    }

    private getOption(name: string) {
        return this.appOptions[name]
    }

    /**
     * @description 添加自定义样式
     */
    private addCustomStyle(): void {
        document.body.classList.add('PdfjsAnnotationExtension')
        this.toggleComment(this.getOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) === 'true')
    }

    /**
     * @description 切换评论栏的显示状态
     * @param open 
     */
    private toggleComment(open: boolean): void {
        if (open) {
            document.body.classList.remove('PdfjsAnnotationExtension_Comment_hidden')
        } else {
            document.body.classList.add('PdfjsAnnotationExtension_Comment_hidden')
        }
    }

    /**
     * @description 检查评论栏是否打开
     * @returns 
     */
    private isCommentOpen(): boolean {
        return !document.body.classList.contains('PdfjsAnnotationExtension_Comment_hidden')
    }

    /**
     * @description 渲染自定义工具栏
     */
    private renderToolbar(): void {
        const toolbar = document.createElement('div')
        this.$PDFJS_toolbar_container.insertAdjacentElement('afterend', toolbar)
        createRoot(toolbar).render(
            <CustomToolbar
                ref={this.customToolbarRef}
                defaultAnnotationName={this.getOption(HASH_PARAMS_DEFAULT_EDITOR_ACTIVE)}
                defaultSidebarOpen={this.getOption(HASH_PARAMS_DEFAULT_SIDEBAR_OPEN) === 'true'}
                userName={this.getOption(HASH_PARAMS_USERNAME)}
                onChange={(currentAnnotation, dataTransfer) => {
                    this.painter.activate(currentAnnotation, dataTransfer)
                }}
                onSave={() => {
                    this.saveData()
                }}
                onExport={async (type) => {
                    if (type === 'excel') {
                        this.exportExcel()
                        return
                    }
                    if (type === 'pdf') {
                        await this.exportPdf()
                        return
                    }
                }}
                onSidebarOpen={(isOpen) => {
                    this.toggleComment(isOpen)
                    this.connectorLine.clearConnection()
                }}
            />
        )
    }

    /**
     * @description 渲染自定义弹出工具条
     */
    private renderPopBar(): void {
        const popbar = document.createElement('div')
        this.$PDFJS_viewerContainer.insertAdjacentElement('afterend', popbar)
        createRoot(popbar).render(
            <CustomPopbar
                ref={this.customPopbarRef}
                onChange={(currentAnnotation, range) => {
                    this.painter.highlightRange(range, currentAnnotation)
                }}
            />
        )
    }

    /**
     * @description 渲染自定义弹出工具条
     */
    private renderAnnotationMenu(): void {
        const annotationMenu = document.createElement('div')
        this.$PDFJS_outerContainer.insertAdjacentElement('afterend', annotationMenu)
        createRoot(annotationMenu).render(
            <CustomAnnotationMenu
                ref={this.customerAnnotationMenuRef}
                onOpenComment={(currentAnnotation) => {
                    this.toggleComment(true)
                    this.customToolbarRef.current.toggleSidebarBtn(true)
                    setTimeout(() => {
                        this.customCommentRef.current.selectedAnnotation(currentAnnotation, true)
                    }, 100)
                }}
                onChangeStyle={(currentAnnotation, style) => {
                    this.painter.updateAnnotationStyle(currentAnnotation, style)
                    this.customToolbarRef.current.updateStyle(currentAnnotation.type, style)
                }}
                onDelete={(currentAnnotation) => {
                    this.painter.delete(currentAnnotation.id, true)
                }}
            />
        )
    }

    /**
     * @description 渲染自定义留言条
     */
    private renderComment(): void {
        const comment = document.createElement('div')
        this.$PDFJS_mainContainer.insertAdjacentElement('afterend', comment)
        createRoot(comment).render(
            <CustomComment
                ref={this.customCommentRef}
                userName={this.getOption(HASH_PARAMS_USERNAME)}
                onSelected={async (annotation) => {
                    await this.painter.highlight(annotation)
                }}
                onDelete={(id) => {
                    this.painter.delete(id)
                }}
                onUpdate={(annotation) => {
                    this.painter.update(annotation.id, {
                        title: annotation.title,
                        contentsObj: annotation.contentsObj,
                        comments: annotation.comments
                    })
                }}
                onScroll={() => {
                    this.connectorLine?.clearConnection()
                }}
            />
        )
    }

    /**
     * @description 隐藏 PDF.js 编辑模式按钮
     */
    private hidePdfjsEditorModeButtons(): void {
        defaultOptions.setting.HIDE_PDFJS_ELEMENT.forEach(item => {
            const element = document.querySelector(item) as HTMLElement;
            if (element) {
                element.style.display = 'none';
                const nextDiv = element.nextElementSibling as HTMLElement;
                if (nextDiv.classList.contains('horizontalToolbarSeparator')) {
                    nextDiv.style.display = 'none'
                }
            }
        });
    }

    private updatePdfjs() {
        const currentScaleValue = this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue
        if (
            currentScaleValue === 'auto' ||
            currentScaleValue === 'page-fit' ||
            currentScaleValue === 'page-width'
        ) {
            this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = '0.8'
            this.PDFJS_PDFViewerApplication.pdfViewer.update()
        } else {
            this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = 'auto'
            this.PDFJS_PDFViewerApplication.pdfViewer.update()
        }
        this.PDFJS_PDFViewerApplication.pdfViewer.currentScaleValue = currentScaleValue
        this.PDFJS_PDFViewerApplication.pdfViewer.update()
    }

    /**
     * @description 绑定 PDF.js 相关事件
     */
    private bindPdfjsEvents(): void {
        this.hidePdfjsEditorModeButtons()
        const setLoadEnd = once(() => {
            this.loadEnd = true
        })

        // 视图更新时隐藏菜单
        this.PDFJS_EventBus._on('updateviewarea', () => {
            this.customerAnnotationMenuRef.current?.close()
            this.connectorLine?.clearConnection()
        })

        // 监听页面渲染完成事件
        this.PDFJS_EventBus._on(
            'pagerendered',
            async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
                setLoadEnd()
                this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
            }
        )

        // 监听文档加载完成事件
        this.PDFJS_EventBus._on('documentloaded', async () => {
            this.painter.initWebSelection(this.$PDFJS_viewerContainer)
            const data = await this.getData()
            this.initialDataHash = hashArrayOfObjects(data)
            await this.painter.initAnnotations(data, defaultOptions.setting.LOAD_PDF_ANNOTATION)
            if (this.loadEnd) {
                this.updatePdfjs()
            }
        })
    }

    /**
     * @description 获取外部批注数据
     * @returns 
     */
    private async getData(): Promise<any[]> {
        const getUrl = this.getOption(HASH_PARAMS_GET_URL);
        if (!getUrl) {
            return [];
        }
        try {
            message.open({
                type: 'loading',
                content: t('normal.processing'),
                duration: 0,
            });
            const response = await fetch(getUrl, { method: 'GET' });

            if (!response.ok) {
                const errorMessage = `HTTP Error ${response.status}: ${response.statusText || 'Unknown Status'}`;
                throw new Error(errorMessage);
            }
            return await response.json();
        } catch (error) {
            Modal.error({
                content: t('load.fail', { value: error?.message }),
                closable: false,
                okButtonProps: {
                    loading: false
                },
                okText: t('normal.ok')
            })
            console.error('Fetch error:', error);
            return [];
        } finally {
            message.destroy();
        }
    }

    /**
     * @description 保存批注数据
     * @returns 
     */
    private async saveData(): Promise<void> {
        const dataToSave = this.painter.getData();
        console.log('%c [ dataToSave ]', 'font-size:13px; background:#d10d00; color:#ff5144;', dataToSave)
        const postUrl = this.getOption(HASH_PARAMS_POST_URL);
        if (!postUrl) {
            message.error({
                content: t('save.noPostUrl', { value: HASH_PARAMS_POST_URL }),
                key: 'save',
            });
            return;
        }
        const modal = Modal.info({
            content: <Space><SyncOutlined spin />{t('save.start')}</Space>,
            closable: false,
            okButtonProps: {
                loading: true
            },
            okText: t('normal.ok')
        })
        try {
            const response = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) {
                throw new Error(`Failed to save PDF. Status: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            // {"status": "ok", "message": "POST received!"}
            this.initialDataHash = hashArrayOfObjects(dataToSave)
            modal.destroy()
            message.success({
                content: t('save.success'),
                key: 'save',
            });
            console.log('Saved successfully:', result);
        } catch (error) {
            modal.update({
                type: 'error',
                content: t('save.fail', { value: error?.message }),
                closable: true,
                okButtonProps: {
                    loading: false
                },
            })
            console.error('Error while saving data:', error);
        }
    }

    private async exportPdf() {
        const dataToSave = this.painter.getData();
        const modal = Modal.info({
            title: t('normal.export'),
            content: <Space><SyncOutlined spin />{t('normal.processing')}</Space>,
            closable: false,
            okButtonProps: {
                loading: true
            },
            okText: t('normal.ok')
        })
        await exportAnnotationsToPdf(this.PDFJS_PDFViewerApplication, dataToSave)
        modal.update({
            type: 'success',
            title: t('normal.export'),
            content: t('pdf.generationSuccess'),
            closable: true,
            okButtonProps: {
                loading: false
            },
        })
    }

    private async exportExcel() {
        const annotations = this.painter.getData()
        await exportAnnotationsToExcel(this.PDFJS_PDFViewerApplication, annotations)
        Modal.info({
            type: 'success',
            title: t('normal.export'),
            content: t('pdf.generationSuccess'),
            closable: true,
            okButtonProps: {
                loading: false
            },
        })
    }

    public hasUnsavedChanges(): boolean {
        return hashArrayOfObjects(this.painter.getData()) !== this.initialDataHash
    }

}

declare global {
    interface Window {
        pdfjsAnnotationExtensionInstance: PdfjsAnnotationExtension
    }
}

window.pdfjsAnnotationExtensionInstance = new PdfjsAnnotationExtension()