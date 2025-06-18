// fontLoader.ts

type FontItem = {
    label: string
    value: string
    external?: boolean
    url?: ArrayBuffer
}

const loadedFonts = new Set<string>()

/**
 * 使用 CSS 动态注入方式加载字体（兼容性好）
 */
function loadFontIfNeeded(font: FontItem): void {
    if (!font.external || !font.url || loadedFonts.has(font.value)) return

    const style = document.createElement('style')
    style.innerHTML = `
    @font-face {
        font-family: '${font.value}';
        src: url('${font.url}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    `
    document.head.appendChild(style)
    loadedFonts.add(font.value)
}

/**
 * 使用现代 FontFace API 加载字体
 */
export async function loadFontWithFontFace(font: FontItem): Promise<void> {
    if (!font.external || !font.url || loadedFonts.has(font.value)) return
    try {
        const fontFace = new FontFace(font.value, `url(${font.url})`)
        await fontFace.load()
        ;(document.fonts as any).add(fontFace)
        loadedFonts.add(font.value)
    } catch (err) {
        loadFontIfNeeded(font)
    }
}

/**
 * 重置字体加载状态
 */
export function resetFontLoadCache(): void {
    loadedFonts.clear()
}
