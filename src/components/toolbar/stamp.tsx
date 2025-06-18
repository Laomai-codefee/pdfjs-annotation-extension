import './index.scss'
import { Button, Checkbox, Col, ColorPicker, Divider, Form, Input, Modal, Popover, Radio, Row, Select } from 'antd'
import Konva from 'konva'
import React, { useRef, useState } from 'react'
import { BoldOutlined, ItalicOutlined, PlusCircleOutlined, StrikethroughOutlined, UnderlineOutlined, UploadOutlined } from '@ant-design/icons'
import { IAnnotationType } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { defaultOptions } from '../../const/default_options'
import { formatFileSize } from '../../utils/utils'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
dayjs.extend(customParseFormat)

interface SignatureToolProps {
    annotation: IAnnotationType
    userName: string
    onAdd: (signatureDataUrl: string) => void
}

type FieldType = {
    stampText: string
    fontStyle: string[]
    fontFamily: string,
    textColor: string
    backgroundColor: string
    borderColor: string
    borderStyle: 'solid' | 'dashed'
    timestamp: string[]
    customTimestampText: string
    dateFormat: string
}

const SHAPE_NAME = 'StampGroup'
const STAMP_WIDTH = 470
const STAMP_HEIGHT = 120

const DATE_FORMAT_OPTIONS = [
    {
        label: '📅',
        options: [
            { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
            { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
            { label: 'YYYY年MM月DD日', value: 'YYYY年MM月DD日' },
            { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
            { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
            { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
            { label: 'dddd, MMMM D, YYYY', value: 'dddd, MMMM D, YYYY' }, // 星期几 + 全月份
            { label: 'MMM D, YYYY', value: 'MMM D, YYYY' }, // Jan 1, 2025
            { label: 'D MMMM YYYY', value: 'D MMMM YYYY' } // 1 January 2025
        ]
    },
    {
        label: '⏰',
        options: [
            { label: 'HH:mm:ss', value: 'HH:mm:ss' },
            { label: 'HH:mm', value: 'HH:mm' },
            { label: 'hh:mm A', value: 'hh:mm A' }, // 12小时制带AM/PM
            { label: 'h:mm A', value: 'h:mm A' },
            { label: 'HH:mm:ss.SSS', value: 'HH:mm:ss.SSS' }
        ]
    },
    {
        label: '🗓️ ',
        options: [
            { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
            { label: 'YYYY-MM-DD HH:mm', value: 'YYYY-MM-DD HH:mm' },
            { label: 'DD/MM/YYYY HH:mm', value: 'DD/MM/YYYY HH:mm' },
            { label: 'MM/DD/YYYY hh:mm A', value: 'MM/DD/YYYY hh:mm A' },
            { label: 'YYYY年MM月DD日 HH:mm', value: 'YYYY年MM月DD日 HH:mm' },
            { label: 'dddd, MMMM D, YYYY HH:mm', value: 'dddd, MMMM D, YYYY HH:mm' },
            { label: 'D MMMM YYYY HH:mm', value: 'D MMMM YYYY HH:mm' }
        ]
    }
]

const StampTool: React.FC<SignatureToolProps> = ({ annotation, onAdd, userName }) => {
    const { t } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const konvaStageRef = useRef<Konva.Stage | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const [customStamps, setCustomStamps] = useState<string[]>([])

    const maxSize = defaultOptions.stamp.MAX_SIZE

    const [form] = Form.useForm()

    const defaultStamps = defaultOptions.stamp.DEFAULT_STAMP || []

    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [stampType, setStampType] = useState<string>('default')

    const DEFAULT_VALUE: FieldType = {
        stampText: t('editor.stamp.defaultText'),
        fontStyle: [],
        fontFamily: defaultOptions.defaultFontList[0].value,
        textColor: defaultOptions.stamp.editor.DEFAULT_TEXT_COLOR,
        backgroundColor: defaultOptions.stamp.editor.DEFAULT_BACKGROUND_COLOR,
        borderColor: defaultOptions.stamp.editor.DEFAULT_BORDER_COLOR,
        borderStyle: 'solid',
        timestamp: ['username', 'date'],
        customTimestampText: '',
        dateFormat: 'YYYY-MM-DD'
    }
    const [lastFormValues, setLastFormValues] = useState<FieldType>(DEFAULT_VALUE)

    const handleAdd = (dataUrl: string) => {
        onAdd(dataUrl)
        setIsPopoverOpen(false)
    }

    const handleOk = () => {
        const layer = konvaStageRef.current?.getLayers()[0]
        if (!layer) return

        const shape = layer.getChildren(node => node.name() === SHAPE_NAME)[0]
        if (!shape) return

        const dataUrl = konvaStageRef.current.toDataURL({
            x: shape.x(),
            y: shape.y(),
            width: shape.width(),
            height: shape.height()
        })

        if (dataUrl) {
            setCustomStamps(prev => [...prev, dataUrl])
            handleAdd(dataUrl)
            setIsModalOpen(false)
        }
    }

    // 文件输入变化的事件处理函数
    const onInputFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement // 获取事件目标（即文件输入）
        const files = target.files // 获取文件列表
        if (files?.length) {
            const _file = files[0] // 获取第一个文件
            if (_file.size > maxSize) {
                // 如果文件大小超过最大限制，显示提示并返回
                alert(t('normal.fileSizeLimit', { value: formatFileSize(maxSize) }))
                // alert(`文件大小超出 ${formatFileSize(maxSize)} 限制`)
                return
            }
            const reader = new FileReader() // 创建文件读取器
            // 文件读取完成后的处理函数
            reader.onload = e => {
                if (typeof e.target?.result === 'string') {
                    target.value = ''
                    // 如果结果是字符串，调用 onAdd 回调函数
                    onAdd(e.target.result)
                    setCustomStamps(prev => [...prev, e.target.result as string])
                    setIsPopoverOpen(false)
                }
            }
            reader.readAsDataURL(_file) // 以数据 URL 的形式读取文件
        }
    }

    const initializeKonvaStage = (values: FieldType) => {
        if (!containerRef.current) return

        const { stampText, fontStyle, textColor, backgroundColor, borderColor, borderStyle, timestamp, dateFormat, fontFamily } = values

        // 清除旧 stage
        konvaStageRef.current?.destroy()

        const stage = new Konva.Stage({
            container: containerRef.current,
            width: STAMP_WIDTH,
            height: STAMP_HEIGHT
        })

        const layer = new Konva.Layer()

        const fontStyleParts: string[] = []
        if (fontStyle.includes('italic')) fontStyleParts.push('italic')
        if (fontStyle.includes('bold')) fontStyleParts.push('bold')
        const fontStyleValue = fontStyleParts.join(' ') || 'normal'
        const isUnderline = fontStyle.includes('underline')
        const isStrikeout = fontStyle.includes('strikeout')
        const now = dayjs()
        const username = userName
        // 使用用户选择的格式来格式化日期
        const formattedDate = dateFormat ? now.format(dateFormat) : ''
        const customText = values.customTimestampText?.trim()
        const timestampParts = [
            timestamp.includes('username') ? username : null,
            timestamp.includes('date') ? formattedDate : null,
            customText || null
        ].filter(Boolean)
        const timestampText = timestampParts.join(' · ')
        let textFontSize = 30
        const timeFontSize = 16
        const spacing = 10

        // 用临时文本节点计算宽度
        const tempTextNode = new Konva.Text({
            text: stampText,
            fontSize: textFontSize,
            fontStyle: fontStyleValue,
            fontFamily: fontFamily
        })

        const tempTimestampNode = new Konva.Text({
            text: timestampText,
            fontSize: timeFontSize,
            fontFamily: fontFamily
        })

        const contentWidth = Math.max(tempTextNode.width(), tempTimestampNode.width()) + 60
        const contentHeight = textFontSize + spacing + timeFontSize + 25

        const shapeWidth = Math.max(contentWidth, 180)
        const shapeHeight = Math.max(contentHeight, 60)

        const shape = new Konva.Rect({
            name: SHAPE_NAME,
            width: shapeWidth,
            height: shapeHeight,
            x: (STAMP_WIDTH - shapeWidth) / 2,
            y: (STAMP_HEIGHT - shapeHeight) / 2,
            fill: backgroundColor,
            strokeWidth: 3,
            stroke: borderColor,
            dash: borderStyle === 'dashed' ? [5, 5] : undefined,
            cornerRadius: 8
        })
        layer.add(shape)
        if (!timestampText) {
            textFontSize = textFontSize * 1.2 // 没有时间戳时字体更大
        }

        // 计算 stampText 的 Y 位置
        let textY: number

        if (timestampText) {
            // 有时间戳：保持原来的位置，靠近顶部
            textY = (STAMP_HEIGHT - shapeHeight) / 2 + 15
        } else {
            // 没有时间戳：stampText 居中显示在 shape 中
            textY = (STAMP_HEIGHT - shapeHeight) / 2 + shapeHeight / 2 - textFontSize / 2
        }

        const stampTextNode = new Konva.Text({
            text: stampText,
            x: 0,
            y: textY,
            width: STAMP_WIDTH,
            align: 'center',
            fontSize: textFontSize,
            fontStyle: fontStyleValue,
            fontFamily: fontFamily,
            fill: textColor
        })

        layer.add(stampTextNode)

        if (isUnderline) {
            const underlineY = stampTextNode.y() + textFontSize + 4
            const underline = new Konva.Line({
                points: [shape.x(), underlineY, shape.x() + shape.width(), underlineY],
                stroke: textColor,
                strokeWidth: 2
            })
            layer.add(underline)
        }

        if (isStrikeout) {
            const strikeoutLineY = stampTextNode.y() + textFontSize / 2
            const strikeoutLine = new Konva.Line({
                points: [shape.x(), strikeoutLineY, shape.x() + shape.width(), strikeoutLineY],
                stroke: textColor,
                strokeWidth: 2
            })
            layer.add(strikeoutLine)
        }

        const timestampNode = new Konva.Text({
            text: timestampText,
            x: 0,
            y: textY + textFontSize + spacing,
            width: STAMP_WIDTH,
            align: 'center',
            fontSize: timeFontSize,
            fontFamily: fontFamily,
            fill: textColor
        })
        if (timestampText) {
            layer.add(timestampNode)
        }
        stage.add(layer)
        konvaStageRef.current = stage
    }

    const destroyKonvaStage = () => {
        const stage = konvaStageRef.current
        if (stage) {
            stage.destroy()
            konvaStageRef.current = null
        }
    }

    return (
        <>
            <Popover
                rootClassName="StampPop"
                content={
                    <div>
                        <Radio.Group
                            block
                            options={[
                                { label: t('normal.default'), value: 'default' },
                                { label: t('normal.custom'), value: 'custom' }
                            ]}
                            size="small"
                            optionType="button"
                            value={stampType}
                            onChange={e => setStampType(e.target.value)}
                        />
                        {stampType === 'default' && (
                            <ul className="StampPop-Container">
                                {defaultStamps.map((s, idx) => (
                                    <li key={idx}>
                                        <img onClick={() => handleAdd(s)} src={s} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div>
                            {stampType === 'custom' && (
                                <>
                                    <ul className="StampPop-Container">
                                        {customStamps.map((s, idx) => (
                                            <li key={idx}>
                                                <img onClick={() => handleAdd(s)} src={s} />
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        color="default"
                                        variant="filled"
                                        style={{ marginTop: 8 }}
                                        block
                                        size="small"
                                        onClick={() => {
                                            setIsPopoverOpen(false)
                                            setIsModalOpen(true)
                                        }}
                                        icon={<PlusCircleOutlined />}
                                    >
                                        {t('toolbar.buttons.createStamp')}
                                    </Button>
                                </>
                            )}
                        </div>
                        <Divider size="small" />
                        <input style={{ display: 'none' }} type="file" ref={fileRef} accept={defaultOptions.stamp.ACCEPT} onChange={onInputFileChange} />
                        <div className="StampPop-Toolbar">
                            <Button
                                block
                                type="link"
                                onClick={() => {
                                    fileRef.current?.click()
                                }}
                                icon={<UploadOutlined />}
                            >
                                {t('normal.upload')}
                            </Button>
                        </div>
                    </div>
                }
                trigger="click"
                open={isPopoverOpen}
                onOpenChange={setIsPopoverOpen}
                placement="bottom"
                arrow={false}
            >
                <div className="icon">{annotation.icon}</div>
                <div className="name">{t(`annotations.${annotation.name}`)}</div>
            </Popover>

            <Modal
                title={t('toolbar.buttons.createStamp')}
                open={isModalOpen}
                onOk={handleOk}
                onClose={destroyKonvaStage}
                afterOpenChange={open => {
                    if (open) {
                        // 使用上一次的表单值或默认值初始化 Konva 画布
                        const initialValues = lastFormValues || DEFAULT_VALUE
                        initializeKonvaStage(initialValues)
                        form.setFieldsValue(initialValues) // 将上一次的值设置回表单
                    }
                }}
                onCancel={() => setIsModalOpen(false)}
                okText={t('normal.ok')}
                cancelText={t('normal.cancel')}
                className="StampTool"
            >
                <div>
                    <div className="StampTool-Container">
                        <div
                            className="StampTool-Container-ImagePreview"
                            ref={containerRef}
                            style={{
                                height: STAMP_HEIGHT
                            }}
                        />
                        <Form
                            form={form}
                            name="basic"
                            layout="vertical"
                            size="middle"
                            onValuesChange={(_changed, allValues) => {
                                const rawTextColor = allValues.textColor
                                const rawBackgroundColor = allValues.backgroundColor
                                const rawBorderColor = allValues.borderColor

                                // 更新状态以保存当前表单值
                                setLastFormValues({
                                    ...allValues,
                                    textColor: rawTextColor?.toHexString ? rawTextColor.toHexString() : rawTextColor,
                                    backgroundColor: rawBackgroundColor?.toHexString ? rawBackgroundColor.toHexString() : rawBackgroundColor,
                                    borderColor: rawBorderColor?.toHexString ? rawBorderColor.toHexString() : rawBorderColor
                                })

                                // 初始化 Konva 画布
                                initializeKonvaStage({
                                    ...allValues,
                                    textColor: rawTextColor?.toHexString ? rawTextColor.toHexString() : rawTextColor,
                                    backgroundColor: rawBackgroundColor?.toHexString ? rawBackgroundColor.toHexString() : rawBackgroundColor,
                                    borderColor: rawBorderColor?.toHexString ? rawBorderColor.toHexString() : rawBorderColor
                                })
                            }}
                            initialValues={DEFAULT_VALUE}
                            autoComplete="off"
                        >
                            <Form.Item<FieldType> label={t('editor.stamp.stampText')} name="stampText">
                                <Input />
                            </Form.Item>
                            <Row>
                                <Col span={5}>
                                    <Form.Item<FieldType> name="textColor" label={t('editor.stamp.textColor')}>
                                        <ColorPicker
                                            format="rgb"
                                            size="small"
                                            arrow={true}
                                            presets={[{ label: '', colors: ['#ffffff', '#000000', ...defaultOptions.colors] }]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item<FieldType> name="fontStyle" label={t('editor.stamp.fontStyle')}>
                                        <Checkbox.Group
                                            options={[
                                                {
                                                    value: 'bold',
                                                    label: <BoldOutlined />
                                                },
                                                {
                                                    value: 'italic',
                                                    label: <ItalicOutlined />
                                                },
                                                {
                                                    value: 'underline',
                                                    label: <UnderlineOutlined />
                                                },
                                                {
                                                    value: 'strikeout',
                                                    label: <StrikethroughOutlined />
                                                }
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={7}>
                                    <Form.Item<FieldType> name="fontFamily" label={t('editor.stamp.fontFamily')}>
                                        <Select
                                            options={defaultOptions.defaultFontList}
                                        />
                                    </Form.Item>
                                </Col>

                            </Row>
                            <Row>
                                <Col span={8}>
                                    <Form.Item<FieldType> name="backgroundColor" label={t('editor.stamp.backgroundColor')}>
                                        <ColorPicker
                                            allowClear
                                            size="small"
                                            arrow={true}
                                            showText={false}
                                            presets={[{ label: '', colors: defaultOptions.colors }]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item<FieldType> name="borderColor" label={t('editor.stamp.borderColor')}>
                                        <ColorPicker
                                            allowClear
                                            size="small"
                                            arrow={true}
                                            showText={false}
                                            presets={[{ label: '', colors: defaultOptions.colors }]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item<FieldType> name="borderStyle" label={t('editor.stamp.borderStyle')}>
                                        <Radio.Group
                                            block
                                            options={[
                                                { label: t('editor.stamp.solid'), value: 'solid' },
                                                { label: t('editor.stamp.dashed'), value: 'dashed' }
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Divider />
                            <Row>
                                <Col span={10}>
                                    <Form.Item<FieldType> name="timestamp" label={t('editor.stamp.timestampText')}>
                                        <Checkbox.Group
                                            options={[
                                                {
                                                    value: 'username',
                                                    label: t('editor.stamp.username')
                                                },
                                                {
                                                    value: 'date',
                                                    label: t('editor.stamp.date')
                                                }
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={14}>
                                    <Form.Item<FieldType> name="dateFormat" label={t('editor.stamp.dateFormat')}>
                                        <Select options={DATE_FORMAT_OPTIONS} />
                                    </Form.Item>

                                </Col>
                            </Row>
                            <Form.Item<FieldType> name="customTimestampText" label={t('editor.stamp.customTimestamp')}>
                                <Input />
                            </Form.Item>
                        </Form>
                    </div>
                    <div className="StampTool-Toolbar"></div>
                </div>
            </Modal>
        </>
    )
}

export { StampTool }
