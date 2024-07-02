function getRGB(color) {
    if (color.startsWith('#')) {
        const colorRGB = parseInt(color.slice(1), 16)
        return [(colorRGB & 0xff0000) >> 16, (colorRGB & 0x00ff00) >> 8, colorRGB & 0x0000ff]
    }

    if (color.startsWith('rgb(')) {
        // getComputedStyle(...).color returns a `rgb(R, G, B)` color.
        return color
            .slice(/* "rgb(".length */ 4, -1) // Strip out "rgb(" and ")".
            .split(',')
            .map(x => parseInt(x))
    }

    if (color.startsWith('rgba(')) {
        return color
            .slice(/* "rgba(".length */ 5, -1) // Strip out "rgba(" and ")".
            .split(',')
            .map(x => parseInt(x))
            .slice(0, 3)
    }
    console.error(`Not a valid color format: "${color}"`)
    return [0, 0, 0]
}

function isElementInDOM(element: HTMLElement): boolean {
    return document.body.contains(element)
}

/**
 * 生成一个符合 RFC 4122 标准的 UUID v4。
 * UUID v4 格式为：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 其中的 x 是随机生成的十六进制数，y 是 8, 9, A, 或 B。
 * @returns {string} 生成的 UUID v4 字符串
 * @private
 */
function generateUUID(): string {
    const bytes = getRandomBytes(16)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // 设置版本号 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // 设置变体 10xx
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .match(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/)!
        .slice(1)
        .join('-')
}

/**
 * 获取指定长度的随机字节数组。
 * 使用 window.crypto 或 node.js 的 crypto 获取安全的随机值。
 * @param length {number} 随机字节的长度
 * @returns {Uint8Array} 随机字节数组
 * @private
 */
function getRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes)
    } else {
        for (let i = 0; i < length; i++) {
            bytes[i] = Math.floor(Math.random() * 256)
        }
    }
    return bytes
}

function setCssCustomProperty(propertyName, value) {
    document.documentElement.style.setProperty(propertyName, value)
}

function removeCssCustomProperty(propertyName) {
    document.documentElement.style.removeProperty(propertyName)
}

async function base64ToImageBitmap(base64) {
    // 将 Base64 数据去掉前缀部分 "data:image/png;base64," (如果有)
    const base64Data = base64.split(',')[1]

    // 解码 Base64 数据为二进制字符串
    const binaryString = atob(base64Data)

    // 创建一个 Uint8Array 来存储解码后的二进制数据
    const length = binaryString.length
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }

    // 创建 Blob 对象，类型为 image/png
    const blob = new Blob([bytes], { type: 'image/png' })

    // 将 Blob 转换为 ImageBitmap
    const imageBitmap = await createImageBitmap(blob)

    return imageBitmap
}

function formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`
    const units = ['KB', 'MB', 'GB', 'TB']
    let unitIndex = -1
    let size = sizeInBytes
    do {
        size /= 1024
        unitIndex++
    } while (size >= 1024 && unitIndex < units.length - 1)

    return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * 等比缩放图像的宽度和高度，使其在给定的最大宽度或高度内。
 *
 * @param width - 原始图像的宽度
 * @param height - 原始图像的高度
 * @param max - 最大宽度或高度，缩放后的尺寸任意一边都不超过该值
 * @returns 一个包含等比缩放后的宽度和高度的对象
 */
function resizeImage(width: number, height: number, max: number): { newWidth: number; newHeight: number } {
    // 检查是否需要缩放
    if (width <= max && height <= max) {
        // 如果宽度和高度都在 max 范围内，不需要缩放，直接返回原尺寸
        return { newWidth: width, newHeight: height }
    }

    // 计算宽度和高度的缩放比例
    const widthScale = max / width
    const heightScale = max / height

    // 选择较小的比例来保持图像的宽高比
    const scaleFactor = Math.min(widthScale, heightScale)

    // 计算缩放后的宽度和高度
    const newWidth = width * scaleFactor
    const newHeight = height * scaleFactor

    return { newWidth, newHeight }
}

export { getRGB, isElementInDOM, generateUUID, getRandomBytes, setCssCustomProperty, removeCssCustomProperty, base64ToImageBitmap, formatFileSize, resizeImage }
