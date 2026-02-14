import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatBubbleOvalLeftEllipsisIcon, HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Moment } from '../../services/momentService'

interface MomentCardProps {
  moment: Moment
  onToggleLike: (momentId: string) => Promise<void>
  onCreateComment: (
    momentId: string,
    content: string,
    parentId?: string,
    replyToName?: string
  ) => Promise<void>
  likeLoading: boolean
  commentLoading: boolean
}

interface GridImageProps {
  images: string[]
  onPreview: (index: number) => void
}

const MomentImageGrid: React.FC<GridImageProps> = ({ images, onPreview }) => {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <button
        type="button"
        className="mt-2 block overflow-hidden rounded-md"
        onClick={() => onPreview(0)}
      >
        <img
          src={images[0]}
          alt="动态图片"
          className="max-h-72 w-auto max-w-[16rem] object-cover"
        />
      </button>
    )
  }

  const useTwoCols = images.length === 2 || images.length === 4
  return (
    <div className={`mt-2 grid gap-1 ${useTwoCols ? 'grid-cols-2 max-w-[13rem]' : 'grid-cols-3 max-w-[16.5rem]'}`}>
      {images.map((image, index) => (
        <button
          key={`${image}-${index}`}
          type="button"
          className="h-20 w-20 overflow-hidden bg-stone-100"
          onClick={() => onPreview(index)}
        >
          <img src={image} alt={`动态图片 ${index + 1}`} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}

const MomentCard: React.FC<MomentCardProps> = ({
  moment,
  onToggleLike,
  onCreateComment,
  likeLoading,
  commentLoading,
}) => {
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ parentId?: string; name?: string } | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const relativeTime = useMemo(
    () => formatDistanceToNow(new Date(moment.created_at), { addSuffix: true, locale: zhCN }),
    [moment.created_at]
  )

  const authorAvatar = moment.author_name === 'AI陪伴助手' ? '/assistant-avatar.svg' : '/user-avatar.svg'

  const handleSubmitComment = async () => {
    const content = commentText.trim()
    if (!content) return

    await onCreateComment(moment.id, content, replyTarget?.parentId, replyTarget?.name)
    setCommentText('')
    setReplyTarget(null)
    setShowCommentInput(false)
  }

  return (
    <article className="fade-rise flex gap-3 border-b border-stone-200/70 px-4 py-4 md:px-6">
      <img
        src={authorAvatar}
        alt={`${moment.author_name}头像`}
        className="h-10 w-10 rounded-md object-cover ring-1 ring-stone-200"
      />

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold text-sky-800">{moment.author_name}</span>
          {moment.location && (
            <span className="text-xs text-stone-500">· {moment.location}</span>
          )}
        </header>

        {moment.content && (
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-stone-900">{moment.content}</p>
        )}

        <MomentImageGrid images={moment.image_urls} onPreview={setPreviewIndex} />

        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span>{relativeTime}</span>
            {moment.session_id && (
              <>
                <span>·</span>
                <Link to={`/chat?sessionId=${moment.session_id}`} className="text-sky-700 hover:text-sky-800">
                  查看原对话
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center overflow-hidden rounded border border-stone-200 bg-stone-100">
            <button
              type="button"
              onClick={() => onToggleLike(moment.id)}
              disabled={likeLoading}
              className="inline-flex items-center gap-1 border-r border-stone-200 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-200 disabled:opacity-50"
            >
              {moment.liked_by_me ? (
                <HeartSolidIcon className="h-4 w-4 text-rose-500" />
              ) : (
                <HeartIcon className="h-4 w-4" />
              )}
              赞
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyTarget(null)
                setShowCommentInput((prev) => !prev)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-200"
            >
              <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4" />
              评论
            </button>
          </div>
        </div>

        {(moment.likes.length > 0 || moment.comments.length > 0) && (
          <div className="mt-2 space-y-1 rounded bg-stone-100 px-2.5 py-2 text-sm">
            {moment.likes.length > 0 && (
              <div className="flex items-start gap-1 text-sky-800">
                <HeartSolidIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <span>{moment.likes.join('，')}</span>
              </div>
            )}

            {moment.comments.map((comment) => (
              <div key={comment.id} className="break-words leading-6">
                <button
                  type="button"
                  className="font-medium text-sky-800 hover:underline"
                  onClick={() => {
                    setReplyTarget({
                      parentId: comment.parent_id || comment.id,
                      name: comment.user_name,
                    })
                    setShowCommentInput(true)
                  }}
                >
                  {comment.user_name}
                </button>
                {comment.reply_to_name && (
                  <span className="text-stone-500"> 回复 </span>
                )}
                {comment.reply_to_name && (
                  <span className="font-medium text-sky-800">{comment.reply_to_name}</span>
                )}
                <span className="text-stone-600">: </span>
                <span>{comment.content}</span>
              </div>
            ))}
          </div>
        )}

        {showCommentInput && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={replyTarget?.name ? `回复 ${replyTarget.name}` : '写评论...'}
              className="min-w-0 flex-1 rounded border border-stone-200 bg-white px-2.5 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              maxLength={1000}
            />
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={commentLoading || !commentText.trim()}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              发送
            </button>
          </div>
        )}
      </div>

      {previewIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6"
          onClick={() => setPreviewIndex(null)}
        >
          <img
            src={moment.image_urls[previewIndex]}
            alt="预览大图"
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </article>
  )
}

export default MomentCard
