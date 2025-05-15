import './index.scss'
import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import { IAnnotationComment, IAnnotationStore, PdfjsAnnotationSubtype, PdfjsAnnotationType } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { formatPDFDate, formatTimestamp, generateUUID } from '../../utils/utils'
import { Button, Dropdown, Input } from 'antd'
import {
    MoreOutlined
} from '@ant-design/icons';
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
    ExportIcon
} from '../../const/icon'
import { defaultOptions } from '../../const/default_options'

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
    PolyLine: <FreeHighlightIcon />,
    Caret: <SignatureIcon />,
    Link: <FreehandIcon />,
    Text: <NoteIcon />,
    FileAttachment: <ExportIcon />,
    Popup: <FreehandIcon />,
    Widget: <FreehandIcon />,
    Note: <NoteIcon />
};

const getIconBySubtype = (subtype: PdfjsAnnotationSubtype): React.ReactNode => {
    return iconMapping[subtype] || null;
};

const AnnotationIcon: React.FC<{ subtype: PdfjsAnnotationSubtype }> = ({ subtype }) => {
    const Icon = getIconBySubtype(subtype);
    return Icon ? <span className="annotation-icon">{Icon}</span> : null;
};

const { TextArea } = Input

interface CustomCommentProps {
    userName: string
    onSelected: (annotation: IAnnotationStore) => void
    onUpdate: (annotation: IAnnotationStore) => void
    onDelete: (id: string) => void
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
    const { t } = useTranslation()

    const annotationRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useImperativeHandle(ref, () => ({
        addAnnotation,
        delAnnotation,
        selectedAnnotation,
        updateAnnotation,
    }))

    const addAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations => [...prevAnnotations, annotation])
        setCurrentAnnotation(null)
    }

    const delAnnotation = (id: string) => {
        setAnnotations(prevAnnotations => prevAnnotations.filter(annotation => annotation.id !== id));
        if (currentAnnotation?.id === id) {
            setCurrentAnnotation(null);
        }
        if (replyAnnotation?.id === id) {
            setReplyAnnotation(null);
        }
        setCurrentReply(null);
    };

    const selectedAnnotation = (annotation: IAnnotationStore, isClick: boolean) => {
        setCurrentAnnotation(annotation)
        if (!isClick) return
        // 滚动到对应的注释
        const element = annotationRefs.current[annotation.id];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                        date: formatTimestamp(Date.now()), // 更新最后修改时间
                    };
                    return newAnnotation;
                }
                return annotation;
            })
        );

        // 清除当前编辑的批注
        setEditAnnotation(null);
    };


    const groupedAnnotations = annotations.reduce((acc, annotation) => {
        if (!acc[annotation.pageNumber]) {
            acc[annotation.pageNumber] = []
        }
        acc[annotation.pageNumber].push(annotation)
        return acc
    }, {} as Record<number, IAnnotationStore[]>)

    const handleAnnotationClick = (annotation: IAnnotationStore) => {
        setCurrentAnnotation(annotation)
        props.onSelected(annotation)
    }

    const updateComment = (annotation: IAnnotationStore, comment: string) => {
        annotation.contentsObj.text = comment
        props.onUpdate(annotation)
    }

    const addReply = (annotation: IAnnotationStore, comment: string) => {
        annotation.comments.push({
            id: generateUUID(),
            title: props.userName,
            date: formatTimestamp(Date.now()),
            content: comment
        })
        props.onUpdate(annotation)
    }

    const updateReply = (annotation: IAnnotationStore, reply: IAnnotationComment, comment: string) => {
        reply.date = formatTimestamp(Date.now())
        reply.content = comment
        reply.title = props.userName
        props.onUpdate(annotation)
    }

    const deleteAnnotation = (annotation: IAnnotationStore) => {
        setAnnotations(prevAnnotations =>
            prevAnnotations.filter(item => item.id !== annotation.id)
        );
        if (currentAnnotation?.id === annotation.id) {
            setCurrentAnnotation(null);
        }
        if (replyAnnotation?.id === annotation.id) {
            setReplyAnnotation(null);
        }
        setCurrentReply(null);
        props.onDelete(annotation.id)
    }

    const deleteReply = (annotation: IAnnotationStore, reply: IAnnotationComment) => {
        let updatedAnnotation: IAnnotationStore | null = null;

        setAnnotations(prevAnnotations =>
            prevAnnotations.map(item => {
                if (item.id === annotation.id) {
                    const updatedComments = item.comments.filter(comment => comment.id !== reply.id);
                    updatedAnnotation = { ...item, comments: updatedComments };
                    return updatedAnnotation;
                }
                return item;
            })
        );
        if (currentReply?.id === reply.id) {
            setCurrentReply(null);
        }
        if (updatedAnnotation) {
            props.onUpdate(updatedAnnotation);
        }
    };

    // Comment 编辑框
    const commentInput = useCallback((annotation: IAnnotationStore) => {
        let comment = ''
        if (editAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea defaultValue={annotation.contentsObj.text} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setEditAnnotation(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        updateComment(annotation, comment)
                    }}>{t('normal.confirm')}</Button>
                </>
            )
        }
        return <p>{annotation.contentsObj.text}</p>
    }, [editAnnotation, currentAnnotation])

    // 回复框
    const replyInput = useCallback((annotation: IAnnotationStore) => {
        let comment = ''
        if (replyAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea autoFocus rows={4} style={{ marginBottom: '8px', marginTop: '8px' }} onBlur={() => setReplyAnnotation(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        addReply(annotation, comment)
                    }}>{t('normal.confirm')}</Button>
                </>
            )
        }
        return null
    }, [replyAnnotation, currentAnnotation])

    // 编辑回复框
    const editReplyInput = useCallback((annotation: IAnnotationStore, reply: IAnnotationComment) => {
        let comment = ''
        if (currentReply && currentReply?.id === reply.id) {
            return (
                <>
                    <TextArea defaultValue={currentReply.content} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setCurrentReply(null)} onChange={(e) => comment = e.target.value} />
                    <Button type="primary" block onMouseDown={() => {
                        updateReply(annotation, reply, comment)
                    }}>{t('normal.confirm')}</Button>
                </>
            )
        }
        return <p>{reply.content}</p>
    }, [replyAnnotation, currentReply])

    const comments = Object.entries(groupedAnnotations).map(([pageNumber, annotationsForPage]) => {
        // 根据 konvaClientRect.y 对 annotationsForPage 进行排序
        const sortedAnnotations = annotationsForPage.sort((a, b) => a.konvaClientRect.y - b.konvaClientRect.y);

        return (
            <div key={pageNumber}>
                <h3>{t('comment.page', { value: pageNumber })}</h3>
                {sortedAnnotations.map((annotation) => {
                    const isSelected = annotation.id === currentAnnotation?.id;
                    const commonProps = { className: isSelected ? 'comment selected' : 'comment' };
                    return (
                        <div {...commonProps} key={annotation.id} onClick={() => handleAnnotationClick(annotation)} ref={el => (annotationRefs.current[annotation.id] = el)} >
                            <div className='title'>
                                <AnnotationIcon subtype={annotation.subtype} />
                                <div className='username'>{annotation.title}</div>
                                <span className='tool'>
                                    {formatPDFDate(annotation.date)}
                                    <Dropdown menu={{
                                        items: [
                                            {
                                                label: t('normal.reply'),
                                                key: '0',
                                                disabled: !defaultOptions.setting.ALLOW_REPLY_ON_STAMP && annotation.pdfjsType === PdfjsAnnotationType.STAMP,
                                                onClick: (e) => {
                                                    e.domEvent.stopPropagation();
                                                    setReplyAnnotation(annotation);
                                                }
                                            },
                                            {
                                                label: t('normal.edit'),
                                                key: '1',
                                                disabled: !defaultOptions.setting.ALLOW_REPLY_ON_STAMP && annotation.pdfjsType === PdfjsAnnotationType.STAMP,
                                                onClick: (e) => {
                                                    e.domEvent.stopPropagation();
                                                    setEditAnnotation(annotation);
                                                }
                                            },
                                            {
                                                label: t('normal.delete'),
                                                key: '3',
                                                onClick: (e) => {
                                                    e.domEvent.stopPropagation();
                                                    deleteAnnotation(annotation);
                                                }
                                            },
                                        ]
                                    }} trigger={['click']}>
                                        <span className='icon'>
                                            <MoreOutlined />
                                        </span>
                                    </Dropdown>
                                </span>
                            </div>
                            {commentInput(annotation)}
                            {annotation.comments?.map((reply, index) => (
                                <div className='reply' key={index}>
                                    <div className='title'>
                                    <div className='username'> {reply.title}</div>
                                        <span className='tool'>{formatPDFDate(reply.date)}
                                            <Dropdown menu={{
                                                items: [
                                                    {
                                                        label: t('normal.edit'),
                                                        key: '1',
                                                        onClick: (e) => {
                                                            e.domEvent.stopPropagation();
                                                            setCurrentReply(reply);
                                                        }
                                                    },
                                                    {
                                                        label: t('normal.delete'),
                                                        key: '2',
                                                        onClick: (e) => {
                                                            e.domEvent.stopPropagation();
                                                            deleteReply(annotation, reply);
                                                        }
                                                    },
                                                ]
                                            }} trigger={['click']}>
                                                <span className='icon'>
                                                    <MoreOutlined />
                                                </span>
                                            </Dropdown>
                                        </span>
                                    </div>
                                    {editReplyInput(annotation, reply)}
                                </div>
                            ))}
                            <div className='reply-input'>
                                {replyInput(annotation)}
                                {(!defaultOptions.setting.ALLOW_REPLY_ON_STAMP && annotation.pdfjsType !== PdfjsAnnotationType.STAMP) && !replyAnnotation && !currentReply && !editAnnotation && currentAnnotation?.id === annotation.id && (
                                    <Button style={{ marginTop: '8px' }} onClick={() => setReplyAnnotation(annotation)} type="primary" block>
                                        {t('normal.reply')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    });


    return (
        <div className="CustomComment">
            <div className='filters'>
                {t('comment.total', { value: annotations.length })}
            </div>
            <div className='list'>{comments}</div>
        </div>
    )
})

export { CustomComment }
