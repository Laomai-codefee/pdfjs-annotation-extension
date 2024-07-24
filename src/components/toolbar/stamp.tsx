import './index.scss' // 导入组件的样式

import React from 'react' // 导入 React

import { IAnnotationType } from '../../const/definitions' // 导入自定义注释类型
import { formatFileSize } from '../../utils/utils' // 导入文件大小格式化工具

// 定义组件的 props 类型
interface StampToolProps {
    annotation: IAnnotationType // 注释类型
    onAdd: (signatureDataUrl: string) => void // 当签名（印章）被添加时的回调函数
}

const StampTool: React.FC<StampToolProps> = props => {
    const maxSize: number = 1024 * 1024 // 最大文件大小为 1MB

    // 文件输入变化的事件处理函数
    const onInputFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement // 获取事件目标（即文件输入）
        const files = target.files // 获取文件列表
        if (files?.length) {
            const _file = files[0] // 获取第一个文件
            if (_file.size > maxSize) {
                // 如果文件大小超过最大限制，显示提示并返回
                alert(`文件大小超出 ${formatFileSize(maxSize)} 限制`)
                return
            }
            const reader = new FileReader() // 创建文件读取器

            // 文件读取完成后的处理函数
            reader.onload = e => {
                if (typeof e.target?.result === 'string') {
                    target.value = ''
                    // 如果结果是字符串，调用 onAdd 回调函数
                    props.onAdd(e.target.result)
                }
            }
            reader.readAsDataURL(_file) // 以数据 URL 的形式读取文件
        }
    }

    return (
        <div className="StampTool">
            <input title="" type="file" accept=".png,.jpg" onChange={onInputFileChange} />
            <div className="icon">{props.annotation.icon}</div>
            <div className="name">{props.annotation.name}</div>
        </div>
    )
}

export { StampTool } // 导出 StampTool 组件
