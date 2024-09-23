import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zh from './zh-cn.json'
import en from './en-us.json'

const resources = {
    en: { translation: en },
    zh: { translation: zh }
}

// 语言映射：将 zh-cn, en-us 映射到 i18n 的语言代码
const languageMap: { [key: string]: string } = {
    'zh-cn': 'zh',
    'en-us': 'en'
}

// 暴露的初始化方法
export const initializeI18n = (lng: string) => {
    // 将 zh-cn/en-us 转换为 zh/en
    const mappedLng = languageMap[lng.toLowerCase()] || 'en' // 默认中文
    i18n.use(initReactI18next) // 使用 react-i18next
        .init({
            resources,
            lng: mappedLng,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false // React 自动防止 XSS
            }
        })
}

// 默认导出 i18n 实例
export default i18n
