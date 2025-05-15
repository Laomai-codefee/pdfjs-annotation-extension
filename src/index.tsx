import './scss/app.scss'

import { EventBus, PDFPageView, PDFViewerApplication } from 'pdfjs'
import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeI18n } from './locale/index'
import { SyncOutlined } from '@ant-design/icons';
import i18n, { t } from 'i18next'
import { CustomPopbar, CustomPopbarRef } from './components/popbar'
import { CustomToolbar, CustomToolbarRef } from './components/toolbar'
import { annotationDefinitions, HASH_PARAMS_GET_URL, HASH_PARAMS_POST_URL, HASH_PARAMS_USERNAME } from './const/definitions'
import { Painter } from './painter'
import { CustomComment, CustomCommentRef } from './components/comment'
import { once, parseQueryString } from './utils/utils'
import { defaultOptions } from './const/default_options'
import { exportAnnotationsToPdf } from './annot'
import { Modal, Space } from 'antd'

interface AppOptions {
    [key: string]: string;
}

class PdfjsAnnotationExtension {
    PDFJS_PDFViewerApplication: PDFViewerApplication // PDF.js 的 PDFViewerApplication 对象
    PDFJS_EventBus: EventBus // PDF.js 的 EventBus 对象
    $PDFJS_mainContainer: HTMLDivElement
    $PDFJS_sidebarContainer: HTMLDivElement // PDF.js 侧边栏容器
    $PDFJS_toolbar_container: HTMLDivElement // PDF.js 工具栏容器
    $PDFJS_viewerContainer: HTMLDivElement // PDF.js 页面视图容器
    customToolbarRef: React.RefObject<CustomToolbarRef> // 自定义工具栏的引用
    customPopbarRef: React.RefObject<CustomPopbarRef>
    customCommentRef: React.RefObject<CustomCommentRef>
    painter: Painter // 画笔实例
    appOptions: AppOptions
    loadEnd: Boolean

    constructor() {
        this.loadEnd = false
        // 初始化 PDF.js 对象和相关属性
        this.PDFJS_PDFViewerApplication = (window as any).PDFViewerApplication
        console.log(this.PDFJS_PDFViewerApplication)
        this.PDFJS_EventBus = this.PDFJS_PDFViewerApplication.eventBus
        this.$PDFJS_sidebarContainer = this.PDFJS_PDFViewerApplication.appConfig.sidebar.sidebarContainer
        this.$PDFJS_toolbar_container = this.PDFJS_PDFViewerApplication.appConfig.toolbar.container
        this.$PDFJS_viewerContainer = this.PDFJS_PDFViewerApplication.appConfig.viewerContainer
        this.$PDFJS_mainContainer = this.PDFJS_PDFViewerApplication.appConfig.mainContainer
        // 使用 createRef 方法创建 React 引用
        this.customToolbarRef = createRef<CustomToolbarRef>()
        this.customPopbarRef = createRef<CustomPopbarRef>()
        this.customCommentRef = createRef<CustomCommentRef>()
        // 加载多语言
        initializeI18n(this.PDFJS_PDFViewerApplication.l10n.getLanguage())

        // 设置 appOptions 的默认值
        this.appOptions = {
            [HASH_PARAMS_USERNAME]: i18n.t('normal.unknownUser'), // 默认用户名
            [HASH_PARAMS_GET_URL]: '', // 默认 GET URL
            [HASH_PARAMS_POST_URL]: '', // 默认 POST URL
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
            onStoreAdd: annotation => {
                this.customCommentRef.current.addAnnotation(annotation)
            },
            onStoreDelete: (id) => {
                this.customCommentRef.current.delAnnotation(id)
            },
            onAnnotationSelected: (annotation, isClick) => {
                this.customCommentRef.current.selectedAnnotation(annotation, isClick)
            },
            onAnnotationChange: (annotation) => {
                this.customCommentRef.current.updateAnnotation(annotation)
            }
        })
        // 初始化操作
        this.init()
    }

    /**
     * @description 初始化 PdfjsAnnotationExtension 类
     */
    private init(): void {
        this.addCustomStyle()
        this.bindPdfjsEvents()
        this.renderToolbar()
        this.renderPopBar()
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
                onChange={(currentAnnotation, dataTransfer) => {
                    this.painter.activate(currentAnnotation, dataTransfer)
                }}
                onSave={() => {
                    this.saveData()
                }}
                onExport={async () => {
                    await this.exportPdf()
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
        // 监听页面渲染完成事件
        this.PDFJS_EventBus._on(
            'pagerendered',
            async ({ source, cssTransform, pageNumber }: { source: PDFPageView; cssTransform: boolean; pageNumber: number }) => {
                setLoadEnd()
                this.painter.initCanvas({ pageView: source, cssTransform, pageNumber })
            }
        )

        // 监听文档加载完成事件
        this.PDFJS_EventBus._on('documentloaded', async (source) => {
            this.painter.initWebSelection(this.$PDFJS_viewerContainer)
            await this.painter.initAnnotations(await this.getData(), defaultOptions.setting.LOAD_PDF_ANNOTATION)
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
            const response = await fetch(getUrl, { method: 'GET' });

            if (!response.ok) {
                console.error(`Fetch failed: ${response.status} ${response.statusText}`);
                return [];
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return [];
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
            return;
        }

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
            console.log('Saved successfully:', result);
        } catch (error) {
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

}

new PdfjsAnnotationExtension()
