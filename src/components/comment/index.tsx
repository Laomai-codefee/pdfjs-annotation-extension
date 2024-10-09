import './index.scss'
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { IAnnotationComment, IAnnotationStore } from '../../const/definitions'
import { useTranslation } from 'react-i18next'
import { formatPDFDate } from '../../utils/utils'
import { Button, Dropdown, Input } from 'antd'
import {
    MoreOutlined
} from '@ant-design/icons';

const { TextArea } = Input

interface CustomCommentProps {
    onChange: () => void
}

export interface CustomCommentRef {
    addAnnotation(annotationStore: IAnnotationStore): void
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

    useImperativeHandle(ref, () => ({
        addAnnotation
    }))

    const addAnnotation = (annotationStore: IAnnotationStore) => {
        setAnnotations(prevAnnotations => [...prevAnnotations, annotationStore])
    }

    const groupedAnnotations = annotations.reduce((acc, annotation) => {
        if (!acc[annotation.pageNumber]) {
            acc[annotation.pageNumber] = []
        }
        acc[annotation.pageNumber].push(annotation)
        return acc
    }, {} as Record<number, IAnnotationStore[]>)

    const handleAnnotationClick = (annotation: IAnnotationStore) => {
        setCurrentAnnotation(annotation)
    }

    // Comment 编辑框
    const commentInput = useCallback((annotation: IAnnotationStore, value: string) => {
        if (editAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea value={value} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setEditAnnotation(null)} />
                    <Button type="primary" block>Confirm</Button>
                </>
            )
        }
        return value
    }, [editAnnotation, currentAnnotation])

    // 回复框
    const replyInput = useCallback((annotation: IAnnotationStore) => {
        console.log(replyAnnotation)
        if (replyAnnotation && currentAnnotation?.id === annotation.id) {
            return (
                <>
                    <TextArea autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setReplyAnnotation(null)} />
                    <Button type="primary" block>Confirm</Button>
                </>
            )
        }
        return null
    }, [replyAnnotation, currentAnnotation])

    // 编辑回复框
    const editReplyInput = useCallback((annotation: IAnnotationStore, reply: IAnnotationComment) => {
        if (currentReply && currentReply?.id === reply.id) {
            return (
                <>
                    <TextArea value={currentReply.content} autoFocus rows={4} style={{ marginBottom: '8px' }} onBlur={() => setCurrentReply(null)} />
                    <Button type="primary" block>Confirm</Button>
                </>
            )
        }
        return reply.content
    }, [replyAnnotation, currentReply])

    const comments = Object.entries(groupedAnnotations).map(([pageNumber, annotationsForPage]) => (
        <div key={pageNumber}>
            <h3>Page {pageNumber}</h3>
            {annotationsForPage.map((annotation) => {
                const isSelected = annotation.id === currentAnnotation?.id
                const commonProps = { className: isSelected ? 'comment selected' : 'comment' }

                return (
                    <div {...commonProps} key={annotation.id} onClick={() => handleAnnotationClick(annotation)}>
                        <div className='title'>
                            {annotation.title}
                            <span>
                                {formatPDFDate(annotation.date)}
                                <Dropdown menu={{
                                    items: [
                                        {
                                            label: 'Reply',
                                            key: '0',
                                            onClick: () => setReplyAnnotation(annotation)
                                        },
                                        {
                                            label: 'Edit',
                                            key: '1',
                                            onClick: () => setEditAnnotation(annotation)
                                        },
                                        {
                                            label: 'Delete',
                                            key: '3',
                                        },
                                    ]
                                }} trigger={['click']}>
                                    <span className='icon'>
                                        <MoreOutlined />
                                    </span>
                                </Dropdown>
                            </span>
                        </div>
                        {commentInput(annotation, annotation.contentsObj.text)}
                        {annotation.comments?.map((reply, index) => (
                            <div className='reply' key={index}>
                                <div className='title'>
                                    {reply.title}
                                    <span>{formatPDFDate(reply.date)}
                                        <Dropdown menu={{
                                            items: [
                                                {
                                                    label: 'Edit',
                                                    key: '1',
                                                    onClick: () => {
                                                        setCurrentReply(reply)
                                                    }
                                                },
                                                {
                                                    label: 'Delete',
                                                    key: '3',
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
                            {!replyAnnotation && !currentReply && !editAnnotation && currentAnnotation?.id === annotation.id && (
                                <Button onClick={() => setReplyAnnotation(annotation)} type="primary" block>
                                    Click to reply
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    ))

    return (
        <div className="CustomComment">
            <div className='filters'>123123</div>
            <div className='list'>{comments}</div>
        </div>
    )
})

export { CustomComment }
