import './index.scss'
import { Button, Modal, Popover, Radio } from 'antd'
import type { UploadChangeParam } from 'antd/es/upload'
import type { UploadFile } from 'antd/es/upload/interface'
import Konva from 'konva'
import React, {
    useEffect,
    useRef,
    useState,
} from 'react'
import { PlusCircleOutlined } from '@ant-design/icons'
import { IAnnotationType } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { defaultOptions } from '../../const/default_options'
import Dragger from 'antd/es/upload/Dragger'
import { formatFileSize } from '../../utils/utils'

interface SignatureToolProps {
    annotation: IAnnotationType
    onAdd: (signatureDataUrl: string) => void
}

const BASE_FONT_SIZE = 80

const SignatureTool: React.FC<SignatureToolProps> = ({ annotation, onAdd }) => {
    const { t, i18n } = useTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const konvaStageRef = useRef<Konva.Stage | null>(null)
    const colorRef = useRef(defaultOptions.signature.COLORS[0])

    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentColor, setCurrentColor] = useState(colorRef.current)
    const [isOKButtonDisabled, setIsOKButtonDisabled] = useState(true)
    const [signatures, setSignatures] = useState<string[]>([])
    const [signatureType, setSignatureType] = useState<string| null>(null)
    const [typedSignature, setTypedSignature] = useState('')
    const fontFamily = i18n.language === 'zh' ? 'Zhi Mang Xing' : 'Lavishly_Yours'

    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

    const maxSize: number = defaultOptions.signature.MAX_SIZE


    useEffect(() => {
        colorRef.current = currentColor
    }, [currentColor])

    const handleAdd = (signature: string) => {
        onAdd(signature)
        setIsPopoverOpen(false)
    }

    const generateTypedSignatureImage = (): string | null => {
        if (!typedSignature.trim()) return null

        const canvas = document.createElement('canvas')
        canvas.width = defaultOptions.signature.WIDTH / 1.1
        canvas.height = defaultOptions.signature.HEIGHT
        const ctx = canvas.getContext('2d')

        if (!ctx) return null

        const padding = 20
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.font = `${BASE_FONT_SIZE}px "${fontFamily}", cursive, sans-serif`

        let textWidth = ctx.measureText(typedSignature).width
        const scale = textWidth + padding * 2 > canvas.width ? (canvas.width - padding * 2) / textWidth : 1
        ctx.font = `${BASE_FONT_SIZE * scale}px "${fontFamily}", cursive, sans-serif`

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.imageSmoothingEnabled = true
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)'
        ctx.shadowBlur = 2
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1
        ctx.fillStyle = currentColor
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)

        return canvas.toDataURL('image/png')
    }

    const handleOk = () => {
        if (signatureType === 'Upload') {
            if (uploadedImageUrl) {
                setSignatures(prev => [...prev, uploadedImageUrl])
                handleAdd(uploadedImageUrl)
                setIsModalOpen(false)
            }
            return
        }
        if (signatureType === 'Enter') {
            const dataUrl = generateTypedSignatureImage()
            if (dataUrl) {
                setSignatures(prev => [...prev, dataUrl])
                handleAdd(dataUrl)
                setIsModalOpen(false)
            }
            return
        }
        if (signatureType === 'Draw') {
            const dataUrl = konvaStageRef.current?.toDataURL()
            if (dataUrl) {
                setSignatures(prev => [...prev, dataUrl])
                handleAdd(dataUrl)
                setIsModalOpen(false)
            }
            return
        }
    }

    const handleClear = () => {
        const stage = konvaStageRef.current
        if (stage) {
            stage.clear()
            stage.getLayers().forEach(layer => layer.destroyChildren())
            setIsOKButtonDisabled(true)
        }
        setTypedSignature('')
        setUploadedImageUrl(null)
    }

    const initializeKonvaStage = () => {
        console.log(containerRef)
        if (!containerRef.current) return

        const stage = new Konva.Stage({
            container: containerRef.current,
            width: defaultOptions.signature.WIDTH,
            height: defaultOptions.signature.HEIGHT,
        })

        const layer = new Konva.Layer()
        stage.add(layer)
        konvaStageRef.current = stage

        let isPainting = false
        let lastLine: Konva.Line | null = null

        const start = () => {
            isPainting = true
            const pos = stage.getPointerPosition()
            if (!pos) return

            lastLine = new Konva.Line({
                stroke: colorRef.current,
                strokeWidth: 3,
                globalCompositeOperation: 'source-over',
                lineCap: 'round',
                lineJoin: 'round',
                points: [pos.x, pos.y],
            })
            layer.add(lastLine)
        }

        const draw = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            if (!isPainting || !lastLine) return
            e.evt.preventDefault()
            const pos = stage.getPointerPosition()
            if (!pos) return

            const newPoints = lastLine.points().concat([pos.x, pos.y])
            lastLine.points(newPoints)
            setIsOKButtonDisabled(false)
        }

        const end = () => {
            isPainting = false
            lastLine = null
        }

        stage.on('mousedown touchstart', start)
        stage.on('mouseup touchend', end)
        stage.on('mousemove touchmove', draw)
    }

    const changeColor = (color: string) => {
        setCurrentColor(color)
        const allLines = konvaStageRef.current?.getLayers()[0]
            .getChildren(node => node.getClassName() === 'Line') || []

        allLines.forEach(line => (line as Konva.Line).stroke(color))
    }

    const handleUploadChange = (info: UploadChangeParam<UploadFile>) => {
        const file = info.fileList[0]?.originFileObj
        if (!file || !file.type.startsWith('image/')) return

        if (file.size > maxSize) {
                // 如果文件大小超过最大限制，显示提示并返回
                alert(t('normal.fileSizeLimit', { value: formatFileSize(maxSize) }))
                // alert(`文件大小超出 ${formatFileSize(maxSize)} 限制`)
                return
            }

        const reader = new FileReader()
        reader.onload = e => {
            const result = e.target?.result
            if (typeof result === 'string') {
                setUploadedImageUrl(result) // 不关闭窗口，显示图片
                setIsOKButtonDisabled(false)
            }
        }
        reader.readAsDataURL(file)
    }

    useEffect(() => {
        setTypedSignature('')
        setUploadedImageUrl(null)
        if (signatureType === 'Enter') {
            setIsOKButtonDisabled(true) // 直到用户输入
        } else if (signatureType === 'Draw') {
            setIsOKButtonDisabled(true) // 直到用户绘制
        } else if (signatureType === 'Upload') {
            setIsOKButtonDisabled(true) // 直到上传成功
        }
    }, [signatureType])


    useEffect(() => {
        setIsOKButtonDisabled(typedSignature.trim().length === 0)
    }, [typedSignature])


    useEffect(() => {
        if (isModalOpen) {
            setTypedSignature('')
            setUploadedImageUrl(null)
            setSignatureType(defaultOptions.signature.TYPE)
        }
    }, [isModalOpen])

    useEffect(() => {
        if (isModalOpen && signatureType === 'Draw') {
            initializeKonvaStage()
        } else {
            konvaStageRef.current?.destroy()
            konvaStageRef.current = null
        }
    }, [signatureType, isModalOpen])

    return (
        <>
            <Popover
                rootClassName="SignaturePop"
                content={
                    <div>
                        <ul className="SignaturePop-Container">
                            {signatures.map((s, idx) => (
                                <li key={idx}>
                                    <img onClick={() => handleAdd(s)} src={s} />
                                </li>
                            ))}
                        </ul>
                        <div className="SignaturePop-Toolbar">
                            <Button block type="link" onClick={() => { setIsPopoverOpen(false); setIsModalOpen(true) }} icon={<PlusCircleOutlined />}>
                                {t('toolbar.buttons.createSignature')}
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
                title={t('toolbar.buttons.createSignature')}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                destroyOnHidden
                okButtonProps={{ disabled: isOKButtonDisabled }}
                okText={t('normal.ok')}
                cancelText={t('normal.cancel')}
                className="SignatureTool"
            >
                <div>
                    <div className="SignatureTool-Header">
                        <Radio.Group
                            block
                            options={[
                                { label: t('normal.draw'), value: 'Draw' },
                                { label: t('normal.enter'), value: 'Enter' },
                                { label: t('normal.upload'), value: 'Upload' }
                            ]}
                            optionType="button"
                            value={signatureType}
                            onChange={e => setSignatureType(e.target.value)}
                        />
                    </div>

                    <div className="SignatureTool-Container" style={{ width: defaultOptions.signature.WIDTH }}>
                        {signatureType === 'Enter' && (
                            <input
                                autoFocus
                                type="text"
                                value={typedSignature}
                                onChange={e => setTypedSignature(e.target.value)}
                                placeholder={t('toolbar.message.signatureArea')}
                                style={{
                                    height: defaultOptions.signature.HEIGHT,
                                    width: defaultOptions.signature.WIDTH / 1.1,
                                    color: currentColor,
                                    fontFamily: `'${fontFamily}', cursive`,
                                    fontSize: BASE_FONT_SIZE,
                                    lineHeight: `${BASE_FONT_SIZE}px`,
                                }}
                            />
                        )}
                        {signatureType === 'Draw' && (
                            <>
                                <div className="SignatureTool-Container-info">{t('toolbar.message.signatureArea')}</div>
                                <div
                                    ref={containerRef}
                                    style={{
                                        height: defaultOptions.signature.HEIGHT,
                                        width: defaultOptions.signature.WIDTH,
                                    }}
                                />
                            </>
                        )}
                        {signatureType === 'Upload' && (
                            <div style={{
                                height: defaultOptions.signature.HEIGHT,
                                width: defaultOptions.signature.WIDTH,
                            }}>
                                {uploadedImageUrl ? (
                                    <div className="SignatureTool-ImagePreview" style={{
                                        height: defaultOptions.signature.HEIGHT,
                                        width: defaultOptions.signature.WIDTH,
                                    }}>
                                        <img src={uploadedImageUrl} alt="preview" />
                                    </div>
                                ) : (
                                    <Dragger
                                        accept={defaultOptions.signature.ACCEPT}
                                        beforeUpload={() => false}
                                        showUploadList={false}
                                        onChange={handleUploadChange}
                                        style={{
                                            height: defaultOptions.signature.HEIGHT,
                                            width: defaultOptions.signature.WIDTH,
                                            }}
                                        >
                                            <p className="ant-upload-drag-icon" />
                                            <p className="ant-upload-text">{t('toolbar.message.uploadArea')}</p>
                                            <p className="ant-upload-hint">{t('toolbar.message.uploadHint', { format: defaultOptions.signature.ACCEPT, maxSize: formatFileSize(defaultOptions.signature.MAX_SIZE) })}</p>
                                    </Dragger>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="SignatureTool-Toolbar" style={{ width: defaultOptions.signature.WIDTH }}>
                        <div className="colorPalette">
                            {
                                signatureType !== 'Upload' &&
                                <>
                                    {
                                        defaultOptions.signature.COLORS.map(color => (
                                            <div key={color} onClick={() => changeColor(color)} className={`cell ${color === currentColor ? 'active' : ''}`}>
                                                <span style={{ backgroundColor: color }} />
                                            </div>
                                        ))
                                    }
                                </>
                            }
                        </div>
                        <div className="clear" onClick={handleClear}>
                            {t('normal.clear')}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export { SignatureTool }
