import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  EllipsisHorizontalIcon,
  HeartIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { format } from 'date-fns'
import { Moment } from '../../services/momentService'
import { resolveMediaUrl } from '../../utils/mediaUrl'

interface MomentCardProps {
  moment: Moment
  currentUserAvatar: string
  onToggleLike: (momentId: string) => Promise<void>
  onRequestComment: (momentId: string, parentId?: string, replyToName?: string) => void
  onDelete: (momentId: string) => Promise<void>
  likeLoading: boolean
  deleteLoading: boolean
  commentActive: boolean
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
        className="mt-3 block overflow-hidden rounded-sm"
        onClick={() => onPreview(0)}
      >
        <img
          src={resolveMediaUrl(images[0])}
          alt="动态图片"
          className="max-h-80 w-auto max-w-[17rem] object-cover"
        />
      </button>
    )
  }

  const useTwoCols = images.length === 2 || images.length === 4
  return (
    <div className={`mt-3 grid gap-1 ${useTwoCols ? 'grid-cols-2 max-w-[11.5rem]' : 'grid-cols-3 max-w-[17.5rem]'}`}>
      {images.map((image, index) => (
        <button
          key={`${image}-${index}`}
          type="button"
          className="h-[92px] w-[92px] overflow-hidden bg-zinc-800"
          onClick={() => onPreview(index)}
        >
          <img
            src={resolveMediaUrl(image)}
            alt={`动态图片 ${index + 1}`}
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}

const MomentCard: React.FC<MomentCardProps> = ({
  moment,
  currentUserAvatar,
  onToggleLike,
  onRequestComment,
  onDelete,
  likeLoading,
  deleteLoading,
  commentActive,
}) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const actionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setShowActionMenu(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const authorAvatar = moment.author_name === '你'
    ? resolveMediaUrl(currentUserAvatar || '/user-avatar.svg')
    : moment.author_name === 'AI陪伴助手'
      ? '/assistant-avatar.svg'
      : resolveMediaUrl(moment.author_avatar_url || '/user-avatar.svg')

  const formattedCreatedAt = useMemo(
    () => format(new Date(moment.created_at), 'yyyy年M月d日 HH:mm'),
    [moment.created_at]
  )

  const getCommentAvatar = (name: string) => {
    if (name === '你') return resolveMediaUrl(currentUserAvatar || '/user-avatar.svg')
    if (name === 'AI陪伴助手') return '/assistant-avatar.svg'
    return '/user-avatar.svg'
  }

  const handleDelete = async () => {
    const confirmed = window.confirm('确认删除这条朋友圈内容吗？删除后无法恢复。')
    if (!confirmed) return
    await onDelete(moment.id)
    setShowActionMenu(false)
  }

  return (
    <article className="border-b border-zinc-800 px-4 py-4 text-zinc-100 last:border-b-0">
      <div className="flex items-start gap-3">
        <img
          src={authorAvatar}
          alt={`${moment.author_name}头像`}
          className="h-12 w-12 rounded-md object-cover"
        />

        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-2">
            <span className="text-[19px] font-semibold text-sky-400">{moment.author_name}</span>
            {moment.location && <span className="text-sm text-zinc-500">· {moment.location}</span>}
          </header>

          {moment.content && (
            <p className="mt-0.5 whitespace-pre-wrap text-[17px] leading-8 text-zinc-100">{moment.content}</p>
          )}

          <MomentImageGrid images={moment.image_urls} onPreview={setPreviewIndex} />

          <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <span>{formattedCreatedAt}</span>
              {moment.session_id && (
                <>
                  <span>·</span>
                  <Link to={`/chat?sessionId=${moment.session_id}`} className="text-sky-400 hover:text-sky-300">
                    原对话
                  </Link>
                </>
              )}
            </div>

            <div ref={actionRef} className="relative">
              <button
                type="button"
                onClick={() => setShowActionMenu((prev) => !prev)}
                className="rounded bg-zinc-800 p-1.5 text-zinc-300 hover:bg-zinc-700"
                aria-label="更多操作"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>

              {showActionMenu && (
                <div className="absolute right-0 top-10 z-30 flex overflow-hidden rounded-md border border-zinc-700 bg-zinc-800/95 shadow-2xl">
                  <button
                    type="button"
                    onClick={async () => {
                      await onToggleLike(moment.id)
                      setShowActionMenu(false)
                    }}
                    disabled={likeLoading}
                    className={`inline-flex h-11 items-center gap-1.5 px-4 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 ${
                      moment.liked_by_me ? 'text-rose-400' : ''
                    }`}
                  >
                    {moment.liked_by_me ? <HeartSolidIcon className="h-5 w-5" /> : <HeartIcon className="h-5 w-5" />}
                    赞
                  </button>
                  <span className="my-2 w-px bg-zinc-700" />
                  <button
                    type="button"
                    onClick={() => {
                      onRequestComment(moment.id)
                      setShowActionMenu(false)
                    }}
                    className={`inline-flex h-11 items-center gap-1.5 px-4 text-sm hover:bg-zinc-700 ${
                      commentActive ? 'text-sky-300' : 'text-zinc-100'
                    }`}
                  >
                    <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                    评论
                  </button>
                  {moment.author_name === '你' && (
                    <>
                      <span className="my-2 w-px bg-zinc-700" />
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="inline-flex h-11 items-center gap-1.5 px-4 text-sm text-rose-400 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        <TrashIcon className="h-5 w-5" />
                        删除
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {(moment.likes.length > 0 || moment.comments.length > 0) && (
            <div className="mt-3 rounded bg-zinc-900 px-3 py-2">
              {moment.likes.length > 0 && (
                <div className={`flex items-start gap-2 text-sm text-zinc-200 ${moment.comments.length > 0 ? 'border-b border-zinc-700 pb-2' : ''}`}>
                  <HeartIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                  <span className="leading-6">{moment.likes.join('，')}</span>
                </div>
              )}

              {moment.comments.length > 0 && (
                <div className="space-y-2 pt-2">
                  {moment.comments.map((comment) => (
                    <button
                      key={comment.id}
                      type="button"
                      className="flex w-full items-start gap-2 text-left"
                      onClick={() => onRequestComment(moment.id, comment.parent_id || comment.id, comment.user_name)}
                    >
                      <img
                        src={getCommentAvatar(comment.user_name)}
                        alt={`${comment.user_name}头像`}
                        className="h-8 w-8 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[15px] font-semibold text-sky-400">{comment.user_name}</span>
                          <span className="shrink-0 text-xs text-zinc-500">
                            {format(new Date(comment.created_at), 'yyyy年M月d日 HH:mm')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[15px] leading-6 text-zinc-200">
                          {comment.reply_to_name ? `回复${comment.reply_to_name}：` : ''}
                          {comment.content}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewIndex !== null && moment.image_urls[previewIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6"
          onClick={() => setPreviewIndex(null)}
        >
          <img
            src={resolveMediaUrl(moment.image_urls[previewIndex])}
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
