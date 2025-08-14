import './index.scss'
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { CommentStatus, IAnnotationComment, IAnnotationStore, PdfjsAnnotationSubtype } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { formatPDFDate, formatTimestamp, generateUUID } from '../../utils/utils'
import { Button, Checkbox, Dropdown, Input, Popover, Space, Typography } from 'antd'
import { CheckCircleOutlined, DislikeOutlined, FilterOutlined, LikeOutlined, MinusCircleOutlined, MinusSquareOutlined, MoreOutlined, StopOutlined } from '@ant-design/icons'
import {
    CircleIcon,
    FreehandIcon,
    FreeHighlightIcon,
    FreetextIcon,
    HighlightIcon,
    RectangleIcon,
    StampIcon,
    StrikeoutIcon,
    UnderlineIcon,
    SignatureIcon,
    NoteIcon,
    ExportIcon,
    ArrowIcon,
    CloudIcon,
    PolylineIcon
} from '../../const/icon'
import Paragraph from 'antd/es/typography/Paragraph'

interface StatusOption {
    labelKey: string; // i18n key
    icon: React.ReactNode;
}

const { Text } = Typography

const iconMapping: Record<PdfjsAnnotationSubtype, React.ReactNode> = {
    Circle: <CircleIcon />,
    FreeText: <FreetextIcon />,
    Ink: <FreehandIcon />,
    Highlight: <HighlightIcon />,
    Underline: <UnderlineIcon />,
    Squiggly: <FreeHighlightIcon />,
    StrikeOut: <StrikeoutIcon />,
    Stamp: <StampIcon />,
    Line: <FreehandIcon />,
    Square: <RectangleIcon />,
    Polygon: <FreehandIcon />,
    Cloud: <CloudIcon />,
    Caret: <SignatureIcon />,
    Link: <FreehandIcon />,
    Text: <NoteIcon />,
    FileAttachment: <ExportIcon />,
    Popup: <FreehandIcon />,
    Widget: <FreehandIcon />,
    Note: <NoteIcon />,
    Arrow: <ArrowIcon />,
    Polyline: <PolylineIcon />
}

const commentStatusOptions: Record<CommentStatus, StatusOption> = {
    [CommentStatus.Accepted]: {
        labelKey: 'comment.status.accepted',
        icon: <LikeOutlined />,
    },
    [CommentStatus.Rejected]: {
        labelKey: 'comment.status.rejected',
        icon: <DislikeOutlined />,
    },
    [CommentStatus.Cancelled]: {
        labelKey: 'comment.status.cancelled',
        icon: <MinusCircleOutlined />,
    },
    [CommentStatus.Completed]: {
        labelKey: 'comment.status.completed',
        icon: <CheckCircleOutlined />,
    },
    [CommentStatus.Closed]: {
        labelKey: 'comment.status.closed',
        icon: <StopOutlined />,
    },
    [CommentStatus.None]: {
        labelKey: 'comment.status.none',
        icon: <MinusSquareOutlined />,
    }
};

const getIconBySubtype = (subtype: PdfjsAnnotationSubtype): React.ReactNode => {
    return iconMapping[subtype] || null
}

const AnnotationIcon: React.FC<{ subtype: PdfjsAnnotationSubtype }> = ({ subtype }) => {
    const Icon = getIconBySubtype(subtype)
    return Icon ? <span className="annotation-icon">{Icon}</span> : null
}

const { TextArea } = Input

interface CustomCommentProps {
    userName: string
    onSelected: (annotation: IAnnotationStore) => void
    onUpdate: (annotation: IAnnotationStore) => void
    onDelete: (id: string) => void
    onScroll?: () => void
}

export interface CustomCommentRef {
    addAnnotation(annotation: IAnnotationStore): void
    delAnnotation(id: string): void
    updateAnnotation(annotation: IAnnotationStore): void
    selectedAnnotation(annotation: IAnnotationStore, isClick: boolean): void
}

/**
 * @description CustomComment
 */
const CustomComment = forwardRef<CustomCommentRef, CustomCommentProps>(function CustomComment(props, ref) {
    const [annotations, setAnnotations] = useState<IAnnotationStore[]>([])
    const [currentAnnotation, setCurrentAnnotation] = useState<IAnnotationStore | null>(null)
    const [replyAnnotation, setReplyAnnotation] = useState<IAnnotationStore | null>(null)
    const [currentReply, setCurrentReply] = useState<IAnnotationComment | null>(null)
    const [editAnnotation, setEditAnnotation] = useState<IAnnotationStore | null>(null)
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [selectedTypes, setSelectedTypes] = useState<PdfjsAnnotationSubtype[]>([])
    const { t } = useTranslation()

    const annotationRefs = useRef<Record<string, HTMLDivElement | null>>({})

    useImperativeHandle(ref, () => ({
        addAnnotation,
        delAnnotation,
        selectedAnnotation,
        updateAnnotation
    }))

    const addAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations => [...prevAnnotations, annotation])
        setCurrentAnnotation(null)
    }

    const delAnnotation = (id: string) => {
        setAnnotations(prevAnnotations => prevAnnotations.filter(annotation => annotation.id !== id))
        if (currentAnnotation?.id === id) {
            setCurrentAnnotation(null)
        }
        if (replyAnnotation?.id === id) {
            setReplyAnnotation(null)
        }
        setCurrentReply(null)
    }

    const selectedAnnotation = (annotation: IAnnotationStore, isClick: boolean) => {
        setCurrentAnnotation(annotation)

        if (!isClick) return

        const isOwn = annotation.title === props.userName
        const isEmptyComment = annotation.contentsObj.text === ''

        // 👇 根据批注归属与内容决定打开评论或回复
        if (isOwn && isEmptyComment) {
            setEditAnnotation(annotation)
        } else {
            setReplyAnnotation(annotation)
        }

        // 👇 滚动至目标批注 DOM 元素
        const element = annotationRefs.current[annotation.id]
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }

    const updateAnnotation = (updatedAnnotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations =>
            prevAnnotations.map(annotation => {
                if (annotation.id === updatedAnnotation.id) {
                    // 更新内容、颜色或其他属性
                    const newAnnotation = {
                        ...annotation,
                        konvaClientRect: updatedAnnotation.konvaClientRect,
                        date: formatTimestamp(Date.now()) // 更新最后修改时间
                    }
                    return newAnnotation
                }
                return annotation
            })
        )

        // 清除当前编辑的批注
        setEditAnnotation(null)
    }

    const allUsers = useMemo(() => {
        const map = new Map<string, number>()
        annotations.forEach(a => {
            map.set(a.title, (map.get(a.title) || 0) + 1)
        })
        return Array.from(map.entries()) // [title, count]
    }, [annotations])

    const allTypes = useMemo(() => {
        const types = new Map<PdfjsAnnotationSubtype, number>()
        annotations.forEach(a => {
            types.set(a.subtype, (types.get(a.subtype) || 0) + 1)
        })
        return Array.from(types.entries()) // [subtype, count]
    }, [annotations])

    // ✅ 初始化默认选中所有 username/type
    useEffect(() => {
        setSelectedUsers(allUsers.map(([u]) => u))
    }, [allUsers])

    useEffect(() => {
        setSelectedTypes(allTypes.map(([t]) => t))
    }, [allTypes])

    const filteredAnnotations = useMemo(() => {
        if (selectedUsers.length === 0 || selectedTypes.length === 0) return []
        return annotations.filter(a => selectedUsers.includes(a.title) && selectedTypes.includes(a.subtype))
    }, [annotations, selectedUsers, selectedTypes])

    const groupedAnnotations = useMemo(() => {
        return filteredAnnotations.reduce(
            (acc, annotation) => {
                if (!acc[annotation.pageNumber]) {
                    acc[annotation.pageNumber] = []
                }
                acc[annotation.pageNumber].push(annotation)
                return acc
            },
            {} as Record<number, IAnnotationStore[]>
        )
    }, [filteredAnnotations])

    const handleUserToggle = (username: string) => {
        setSelectedUsers(prev => (prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]))
    }

    const handleTypeToggle = (type: PdfjsAnnotationSubtype) => {
        setSelectedTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]))
    }

    const filterContent = (
        <div className="CustomComment_filterContent">
            <div className="title">{t('normal.author')}</div>
            <ul>
                {allUsers.map(([user, count]) => (
                    <li key={user}>
                        <Checkbox checked={selectedUsers.includes(user)} onChange={() => handleUserToggle(user)}>
                            <Space>
                                <Text ellipsis style={{ maxWidth: 200 }}>
                                    {user}
                                </Text>
                                <Text type="secondary">({count})</Text>
                            </Space>
                        </Checkbox>
                    </li>
                ))}
            </ul>
            <div className="title">{t('normal.type')}</div>
            <ul>
                {allTypes.map(([type, count]) => (
                    <li key={type}>
                        <Checkbox checked={selectedTypes.includes(type)} onChange={() => handleTypeToggle(type)}>
                            <Space>
                                <AnnotationIcon subtype={type} />
                                <Text type="secondary">({count})</Text>
                            </Space>
                        </Checkbox>
                    </li>
                ))}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    type="link"
                    onClick={() => {
                        setSelectedUsers(allUsers.map(([u]) => u))
                        setSelectedTypes(allTypes.map(([t]) => t))
                    }}
                >
                    {t('normal.selectAll')}
                </Button>
                <Button
                    type="link"
                    onClick={() => {
                        setSelectedUsers([])
                        setSelectedTypes([])
                    }}
                >
                    {t('normal.clear')}
                </Button>
            </div>
        </div>
    )

    const getLastStatusIcon = (annotation: IAnnotationStore): React.ReactNode => {
        const lastWithStatus = [...(annotation.comments || [])]
            .reverse()
            .find(c => c.status !== undefined && c.status !== null)

        const status = lastWithStatus?.status ?? CommentStatus.None
        return commentStatusOptions[status]?.icon ?? commentStatusOptions[CommentStatus.None].icon
    }

    const handleAnnotationClick = (annotation: IAnnotationStore) => {
        setCurrentAnnotation(annotation)
        props.onSelected(annotation)
    }

    const updateComment = (annotation: IAnnotationStore, comment: string) => {
        annotation.contentsObj.text = comment
        props.onUpdate(annotation)
    }

    const addReply = (annotation: IAnnotationStore, comment: string, status?: CommentStatus) => {
        const newReply = {
            id: generateUUID(),
            title: props.userName,
            date: formatTimestamp(Date.now()),
            content: comment,
            status
        }

        setAnnotations(prevAnnotations =>
            prevAnnotations.map(a => {
                if (a.id === annotation.id) {
                    const updatedAnnotation = {
                        ...a,
                        comments: [...(a.comments || []), newReply],
                        date: formatTimestamp(Date.now())
                    }
                    props.onUpdate(updatedAnnotation)
                    return updatedAnnotation
                }
                return a
            })
        )

        setReplyAnnotation(null)
    }


    const updateReply = (annotation: IAnnotationStore, reply: IAnnotationComment, comment: string) => {
        reply.date = formatTimestamp(Date.now())
        reply.content = comment
        reply.title = props.userName
        props.onUpdate(annotation)
    }

    const deleteAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations => prevAnnotations.filter(item => item.id !== annotation.id))
        if (currentAnnotation?.id === annotation.id) {
            setCurrentAnnotation(null)
        }
        if (replyAnnotation?.id === annotation.id) {
            setReplyAnnotation(null)
        }
        setCurrentReply(null)
        props.onDelete(annotation.id)
    }

    const deleteReply = (annotation: IAnnotationStore, reply: IAnnotationComment) => {
        let updatedAnnotation: IAnnotationStore | null = null

        setAnnotations(prevAnnotations =>
            prevAnnotations.map(item => {
                if (item.id === annotation.id) {
                    const updatedComments = item.comments.filter(comment => comment.id !== reply.id)
                    updatedAnnotation = { ...item, comments: updatedComments }
                    return updatedAnnotation
                }
                return item
            })
        )
        if (currentReply?.id === reply.id) {
            setCurrentReply(null)
        }
        if (updatedAnnotation) {
            props.onUpdate(updatedAnnotation)
        }
    }

    // Comment 编辑框
    const commentInput = useCallback(
        (annotation: IAnnotationStore) => {
            let comment = ''
            if (editAnnotation && currentAnnotation?.id === annotation.id) {
                const handleSubmit = () => {
                    updateComment(annotation, comment)
                    setEditAnnotation(null)
                }
                return (
                    <>
                        <TextArea
                            defaultValue={annotation.contentsObj.text}
                            autoFocus
                            rows={4}
                            style={{ marginBottom: '8px', marginTop: '8px' }}
                            onBlur={() => setEditAnnotation(null)}
                            onChange={e => (comment = e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSubmit()
                                }
                            }}
                        />
                        <Button
                            type="primary"
                            block
                            onMouseDown={handleSubmit}
                        >
                            {t('normal.confirm')}
                        </Button>
                    </>
                )
            }
            return <Paragraph style={{ margin: '8px 0 8px 15px'}} ellipsis={{ rows: 3, expandable: true, symbol: t('normal.more') }}>{annotation.contentsObj.text}</Paragraph>
        },
        [editAnnotation, currentAnnotation]
    )

    // 回复框
    const replyInput = useCallback(
        (annotation: IAnnotationStore) => {
            let comment = ''
            if (replyAnnotation && currentAnnotation?.id === annotation.id) {
                const handleSubmit = () => {
                    addReply(annotation, comment)
                    setReplyAnnotation(null)
                }
                return (
                    <>
                        <TextArea
                            autoFocus
                            rows={4}
                            style={{ marginBottom: '8px', marginTop: '8px' }}
                            onBlur={() => setReplyAnnotation(null)}
                            onChange={e => (comment = e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSubmit()
                                }
                            }}
                        />
                        <Button
                            type="primary"
                            block
                            onMouseDown={handleSubmit}
                        >
                            {t('normal.confirm')}
                        </Button>
                    </>
                )
            }
            return null
        },
        [replyAnnotation, currentAnnotation]
    )

    // 编辑回复框
    const editReplyInput = useCallback(
        (annotation: IAnnotationStore, reply: IAnnotationComment) => {
            let comment = ''
            if (currentReply && currentReply.id === reply.id) {
                const handleSubmit = () => {
                    updateReply(annotation, reply, comment)
                    setCurrentReply(null)
                }
                return (
                    <>
                        <TextArea
                            defaultValue={currentReply.content}
                            autoFocus
                            rows={4}
                            style={{ marginBottom: '8px' }}
                            onBlur={() => setCurrentReply(null)}
                            onChange={e => (comment = e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSubmit()
                                }
                            }}
                        />
                        <Button type="primary" block onMouseDown={handleSubmit}>
                            {t('normal.confirm')}
                        </Button>
                    </>
                )
            }

            return <p>{reply.content}</p>
        },
        [replyAnnotation, currentReply]
    )

    const comments = Object.entries(groupedAnnotations).map(([pageNumber, annotationsForPage]) => {
        // 根据 konvaClientRect.y 对 annotationsForPage 进行排序
        const sortedAnnotations = annotationsForPage.sort((a, b) => a.konvaClientRect.y - b.konvaClientRect.y)

        return (
            <div key={pageNumber} className="group">
                <h3>
                    {t('comment.page', { value: pageNumber })}
                    <span>{t('comment.total', { value: annotationsForPage.length })}</span>
                </h3>
                {sortedAnnotations.map(annotation => {
                    const isSelected = annotation.id === currentAnnotation?.id
                    const commonProps = { className: isSelected ? 'comment selected' : 'comment', id: `annotation-${annotation.id}` }
                    return (
                        <div
                            {...commonProps}
                            key={annotation.id}
                            onClick={() => handleAnnotationClick(annotation)}
                            ref={el => (annotationRefs.current[annotation.id] = el)}
                        >
                            <div className="title">
                                <AnnotationIcon subtype={annotation.subtype} />
                                <div className="username">{annotation.title}
                                    <span>{formatPDFDate(annotation.date, true)}</span>
                                </div>
                                <span className="tool">
                                    <Dropdown
                                        menu={{
                                            items: Object.entries(commentStatusOptions).map(([statusKey, option]) => ({
                                                key: statusKey,
                                                label: t(option.labelKey),
                                                icon: option.icon,
                                                onClick: (e) => {
                                                    addReply(annotation, t('comment.statusText', { value: t(option.labelKey) }), e.key as CommentStatus)
                                                    setReplyAnnotation(null)
                                                }
                                            }))
                                        }}
                                        trigger={['click']}
                                    >
                                        <span className="icon">
                                            {getLastStatusIcon(annotation)}
                                        </span>
                                    </Dropdown>
                                    <Dropdown
                                        menu={{
                                            items: [
                                                {
                                                    label: t('normal.reply'),
                                                    key: '0',
                                                    onClick: e => {
                                                        e.domEvent.stopPropagation()
                                                        setReplyAnnotation(annotation)
                                                    }
                                                },
                                                {
                                                    label: t('normal.edit'),
                                                    key: '1',
                                                    onClick: e => {
                                                        e.domEvent.stopPropagation()
                                                        setEditAnnotation(annotation)
                                                    }
                                                },
                                                {
                                                    label: t('normal.delete'),
                                                    key: '3',
                                                    onClick: e => {
                                                        e.domEvent.stopPropagation()
                                                        deleteAnnotation(annotation)
                                                    }
                                                }
                                            ]
                                        }}
                                        trigger={['click']}
                                    >
                                        <span className="icon">
                                            <MoreOutlined />
                                        </span>
                                    </Dropdown>
                                </span>
                            </div>
                            {commentInput(annotation)}
                            {annotation.comments?.map((reply, index) => (
                                <div className="reply" key={index}>
                                    <div className="title">
                                        <div className="username"> {reply.title}
                                            <span>{formatPDFDate(reply.date, true)}</span>
                                        </div>
                                        <span className="tool">
                                            <Dropdown
                                                menu={{
                                                    items: [
                                                        {
                                                            label: t('normal.edit'),
                                                            key: '1',
                                                            onClick: e => {
                                                                e.domEvent.stopPropagation()
                                                                setCurrentReply(reply)
                                                            }
                                                        },
                                                        {
                                                            label: t('normal.delete'),
                                                            key: '2',
                                                            onClick: e => {
                                                                e.domEvent.stopPropagation()
                                                                deleteReply(annotation, reply)
                                                            }
                                                        }
                                                    ]
                                                }}
                                                trigger={['click']}
                                            >
                                                <span className="icon">
                                                    <MoreOutlined />
                                                </span>
                                            </Dropdown>
                                        </span>
                                    </div>
                                    {editReplyInput(annotation, reply)}
                                </div>
                            ))}
                            <div className="reply-input">
                                {replyInput(annotation)}
                                {
                                    !replyAnnotation &&
                                    !currentReply &&
                                    !editAnnotation &&
                                    currentAnnotation?.id === annotation.id && (
                                        <Button style={{ marginTop: '8px' }} onClick={() => setReplyAnnotation(annotation)} type="primary" block>
                                            {t('normal.reply')}
                                        </Button>
                                    )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    })
    return (
        <div className="CustomComment" onScroll={() => {props.onScroll && props.onScroll() }}>
            <div className="filters">
                <Popover content={filterContent} trigger="click" placement="bottomLeft">
                    <Button size="small" icon={<FilterOutlined />} />
                </Popover>
            </div>
            <div className="list">{comments}</div>
        </div>
    )
})

export { CustomComment }
