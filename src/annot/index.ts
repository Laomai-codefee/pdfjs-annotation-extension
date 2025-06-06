import { PDFDocument, PDFName, PDFPage } from 'pdf-lib'
import { PDFViewerApplication } from 'pdfjs'
import { IAnnotationStore, PdfjsAnnotationType } from '../const/definitions'
import { TextParser } from './parse_text'
import { AnnotationParser } from './parse'
import { HighlightParser } from './parse_highlight'
import { UnderlineParser } from './parse_underline'
import { StrikeOutParser } from './parse_strikeout'
import { SquareParser } from './parse_square'
import { CircleParser } from './parse_circle'
import { InkParser } from './parse_ink'
import { getTimestampString } from '../utils/utils'
import { FreeTextParser } from './parse_freetext'
import { StampParser } from './parse_stamp'

// import { HighlightParser } from './parse_highlight' // future
// import { InkParser } from './parse_ink' // future

// 映射不同批注类型到对应的解析器类
const parserMap: {
    [key: number]: new (pdfDoc: PDFDocument, page: PDFPage, ann: IAnnotationStore) => AnnotationParser
} = {
    [PdfjsAnnotationType.TEXT]: TextParser,
    [PdfjsAnnotationType.HIGHLIGHT]: HighlightParser,
    [PdfjsAnnotationType.UNDERLINE]: UnderlineParser,
    [PdfjsAnnotationType.STRIKEOUT]: StrikeOutParser,
    [PdfjsAnnotationType.SQUARE]: SquareParser,
    [PdfjsAnnotationType.CIRCLE]: CircleParser,
    [PdfjsAnnotationType.INK]: InkParser,
    [PdfjsAnnotationType.POLYLINE]: InkParser,
    [PdfjsAnnotationType.FREETEXT]: FreeTextParser,
    [PdfjsAnnotationType.STAMP]: StampParser
    // 你可以在这里扩展其他类型的解析器
}

/**
 * 将单个注解对象解析并添加到指定 PDF 页面中。
 *
 * @param annotation - 批注数据对象（IAnnotationStore 格式）
 * @param page - 要添加注解的 PDF 页面
 * @param pdfDoc - 当前正在编辑的 PDF 文档实例
 */
async function parseAnnotationToPdf(annotation: IAnnotationStore, page: PDFPage, pdfDoc: PDFDocument): Promise<void> {
    const ParserClass = parserMap[annotation.pdfjsType]
    if (ParserClass) {
        const parser = new ParserClass(pdfDoc, page, annotation)
        await parser.parse()
    } else {
        console.warn('Unsupported annotation type:', annotation.pdfjsType)
    }
}

/**
 * 触发 PDF 下载
 *
 * @param data - 保存后的 PDF 数据（Uint8Array）
 * @param filename - 下载时使用的文件名
 */
function downloadPdf(data: Uint8Array, filename: string) {
    // 获取 PDF 的有效 ArrayBuffer 内容，避免使用共享内存或偏移错误
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    // 创建 Blob 并生成 URL 下载链接
    // @ts-ignore
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
function getMetaContent(name: string): string | null {
  const metaTag = document.querySelector(`meta[name="${name}"]`);
  if (metaTag) {
    return metaTag.getAttribute('content');
  }
  return null;
}
/**
 * 触发 PDF 上传
 *
 * @param data - 保存后的 PDF 数据（Uint8Array）
 * @param filename - 下载时使用的文件名
 */
async function postPdf(data: Uint8Array, filename: string, url: string) {
    const formData = new FormData();
    formData.append('file', new Blob([data]), filename);

    const csrfToken = getMetaContent('_csrf'); // 获取 CSRF token 值
    const csrfHeaderName = getMetaContent('_csrf_header'); // 获取 CSRF header 名称


     const headers = new Headers();
     headers.append(csrfHeaderName, csrfToken); // 使用读取到的 header 名称和 token 值
     const requestOptions: RequestInit = {
        method: 'POST',
        headers: headers,
        body: formData, // 使用 FormData 作为请求体
        redirect: 'follow'
    };

    // 使用fetch发送到后端接口
   const result = await fetch(url, requestOptions).then(response => {
        if (!response.ok){
            console.log("postPdf Error",response);
            throw new Error(`HTTP error! status: ${response.status}`)
        };
        return response.json();
    }).then(result => {
      console.log('文件上传成功:', result);
        return result;
    }).catch(error => {
      console.error('文件上传失败:', error);
    });
    console.log("postPdf result", result);
    return result;
}

/**
 * 从 PDF 中清除所有页面上的原始注解（Annots）
 *
 * @param pdfDoc - 要处理的 PDF 文档对象
 */
function clearAllAnnotations(pdfDoc: PDFDocument) {
    for (const page of pdfDoc.getPages()) {
        const annotsKey = PDFName.of('Annots')
        if (page.node.has(annotsKey)) {
            page.node.set(annotsKey, pdfDoc.context.obj([])) // 清空批注数组
        }
    }
}

// 动态加载字体文件，返回 ArrayBuffer
async function loadFontBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load font at ${url}`)
    return await response.arrayBuffer()
}


/**
 * 主导函数：加载 PDF，插入所有注解，然后触发提交后台服务器。
 *
 * @param url - 要加载的 PDF 文件 URL
 * @param annotations - 解析后的批注数据数组
 */
async function submitAnnotationsToPdf(PDFViewerApplication: PDFViewerApplication, annotations: IAnnotationStore[], postPdfUrl: string) {
    console.log(PDFViewerApplication)
    // 加载 PDF 文件为 pdf-lib 可识别的文档对象
    const response = await fetch(PDFViewerApplication._downloadUrl)
    const pdfBytes = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // ✅ 清除原有的所有批注
    clearAllAnnotations(pdfDoc)

    // 遍历每一个注解并解析应用到对应页面
    for (const ann of annotations) {
        const page = pdfDoc.getPages()[ann.pageNumber - 1]
        await parseAnnotationToPdf(ann, page, pdfDoc)
    }

    // 保存带注解的 PDF
    const modifiedPdf = await pdfDoc.save()
    // 使用 title + 时间戳作为文件名
    const baseName = PDFViewerApplication._title || 'annotated'
    const fileName = `${baseName}-${getTimestampString()}.pdf`

    const result = await postPdf(modifiedPdf, fileName, postPdfUrl)
    console.log("submitAnnotationsToPdf result", result);
    return result;
}

/**
 * 主导函数：加载 PDF，插入所有注解，然后触发下载。
 *
 * @param url - 要加载的 PDF 文件 URL
 * @param annotations - 解析后的批注数据数组
 */
async function exportAnnotationsToPdf(PDFViewerApplication: PDFViewerApplication, annotations: IAnnotationStore[]) {
    console.log(PDFViewerApplication)
    // 加载 PDF 文件为 pdf-lib 可识别的文档对象
    const response = await fetch(PDFViewerApplication._downloadUrl)
    const pdfBytes = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)

    // ✅ 清除原有的所有批注
    clearAllAnnotations(pdfDoc)

    // 遍历每一个注解并解析应用到对应页面
    for (const ann of annotations) {
        const page = pdfDoc.getPages()[ann.pageNumber - 1]
        await parseAnnotationToPdf(ann, page, pdfDoc)
    }

    // 保存带注解的 PDF
    const modifiedPdf = await pdfDoc.save()
    // 使用 title + 时间戳作为文件名
    const baseName = PDFViewerApplication._title || 'annotated'
    const fileName = `${baseName}-${getTimestampString()}.pdf`

    downloadPdf(modifiedPdf, fileName)
}

export {submitAnnotationsToPdf, exportAnnotationsToPdf }
