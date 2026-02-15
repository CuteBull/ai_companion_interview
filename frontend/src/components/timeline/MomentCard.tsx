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
import { parseMomentCommentContent } from '../../utils/commentMedia'

interface MomentCardProps {
  moment: Moment
  currentUserAvatar: string
  isDarkMode: boolean
  onToggleLike: (momentId: string) => Promise<void>
  onRequestComment: (momentId: string, parentId?: string, replyToName?: string) => void
  onDelete: (momentId: string) => Promise<void>
  likeLoading: boolean
  deleteLoading: boolean
  commentActive: boolean
}

interface GridImageProps {
  images: string[]
  isDarkMode: boolean
  onPreview: (index: number) => void
}

const MomentImageGrid: React.FC<GridImageProps> = ({ images, isDarkMode, onPreview }) => {
  const [failedIndexes, setFailedIndexes] = useState<number[]>([])

  useEffect(() => {
    setFailedIndexes([])
  }, [images])

  const visibleImages = images
    .map((image, index) => ({ image, index }))
    .filter((item) => !failedIndexes.includes(item.index))

  if (visibleImages.length === 0) return null

  if (visibleImages.length === 1) {
    const item = visibleImages[0]
    return (
      <button
        type="button"
        className="mt-3 block overflow-hidden rounded-xl"
        onClick={() => onPreview(item.index)}
      >
        <img
          src={resolveMediaUrl(item.image)}
          alt="动态图片"
          className="max-h-80 w-auto max-w-[17rem] object-cover"
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailedIndexes((prev) => (prev.includes(item.index) ? prev : [...prev, item.index]))
          }}
        />
      </button>
    )
  }

  const useTwoCols = visibleImages.length === 2 || visibleImages.length === 4
  return (
    <div className={`mt-3 grid gap-1 ${useTwoCols ? 'grid-cols-2 max-w-[11.5rem]' : 'grid-cols-3 max-w-[17.5rem]'}`}>
      {visibleImages.map(({ image, index }) => (
        <button
          key={`${image}-${index}`}
          type="button"
          className={`h-[92px] w-[92px] overflow-hidden rounded-md ${
            isDarkMode ? 'bg-zinc-800' : 'bg-stone-200'
          }`}
          onClick={() => onPreview(index)}
        >
          <img
            src={resolveMediaUrl(image)}
            alt={`动态图片 ${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => {
              setFailedIndexes((prev) => (prev.includes(index) ? prev : [...prev, index]))
            }}
          />
        </button>
      ))}
    </div>
  )
}

const MomentCard: React.FC<MomentCardProps> = ({
  moment,
  currentUserAvatar,
  isDarkMode,
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
    <article className={`group border-b px-4 py-4 transition-colors last:border-b-0 ${
      isDarkMode ? 'border-zinc-800 text-zinc-100 hover:bg-zinc-900/35' : 'border-stone-200/80 text-stone-900 hover:bg-white/55'
    }`}>
      <div className="flex items-start gap-3">
        <img
          src={authorAvatar}
          alt={`${moment.author_name}头像`}
          className={`h-12 w-12 rounded-2xl object-cover ring-2 ${
            isDarkMode ? 'ring-cyan-500/25' : 'ring-teal-200'
          }`}
          loading="lazy"
          decoding="async"
        />

        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-2">
            <span className={`text-[20px] font-semibold ${isDarkMode ? 'text-cyan-300' : 'text-sky-700'}`}>{moment.author_name}</span>
            {moment.location && <span className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-stone-500'}`}>· {moment.location}</span>}
          </header>

          {moment.content && (
            <p className={`mt-1 whitespace-pre-wrap text-[17px] leading-8 ${
              isDarkMode ? 'text-zinc-100' : 'text-stone-900'
            }`}>{moment.content}</p>
          )}

          <MomentImageGrid images={moment.image_urls} isDarkMode={isDarkMode} onPreview={setPreviewIndex} />

          <div className={`mt-3 flex items-center justify-between text-sm ${
            isDarkMode ? 'text-zinc-500' : 'text-stone-500'
          }`}>
            <div className="flex items-center gap-2">
              <span>{formattedCreatedAt}</span>
              {moment.session_id && (
                <>
                  <span>·</span>
                  <Link to={`/chat?sessionId=${moment.session_id}`} className={isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-500'}>
                    原对话
                  </Link>
                </>
              )}
            </div>

            <div ref={actionRef} className="relative">
              <button
                type="button"
                onClick={() => setShowActionMenu((prev) => !prev)}
                className={`rounded-xl p-1.5 transition ${
                  isDarkMode
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200'
                }`}
                aria-label="更多操作"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </button>

              {showActionMenu && (
                <div className={`absolute bottom-12 right-0 z-50 flex overflow-hidden rounded-xl border shadow-2xl backdrop-blur ${
                  isDarkMode
                    ? 'border-zinc-700 bg-zinc-800/95'
                    : 'border-stone-300 bg-white/95'
                }`}>
                  <button
                    type="button"
                    onClick={async () => {
                      await onToggleLike(moment.id)
                      setShowActionMenu(false)
                    }}
                    disabled={likeLoading}
                    className={`inline-flex h-11 items-center gap-1.5 px-4 text-sm transition disabled:opacity-50 ${
                      isDarkMode ? 'text-zinc-100 hover:bg-zinc-700' : 'text-stone-800 hover:bg-stone-100'
                    } ${moment.liked_by_me ? 'text-rose-400' : ''}`}
                  >
                    {moment.liked_by_me ? <HeartSolidIcon className="h-5 w-5" /> : <HeartIcon className="h-5 w-5" />}
                    赞
                  </button>
                  <span className={`my-2 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-stone-300'}`} />
                  <button
                    type="button"
                    onClick={() => {
                      onRequestComment(moment.id)
                      setShowActionMenu(false)
                    }}
                    className={`inline-flex h-11 items-center gap-1.5 px-4 text-sm transition ${
                      isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-stone-100'
                    } ${
                      commentActive ? (isDarkMode ? 'text-sky-300' : 'text-sky-600') : (isDarkMode ? 'text-zinc-100' : 'text-stone-800')
                    }`}
                  >
                    <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5" />
                    评论
                  </button>
                  {moment.author_name === '你' && (
                    <>
                      <span className={`my-2 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-stone-300'}`} />
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className={`inline-flex h-11 items-center gap-1.5 px-4 text-sm text-rose-400 transition disabled:opacity-50 ${
                          isDarkMode ? 'hover:bg-zinc-700' : 'hover:bg-rose-50'
                        }`}
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
            <div className={`mt-3 rounded-2xl px-3 py-2 ${
              isDarkMode ? 'bg-zinc-900/90 ring-1 ring-zinc-800/80' : 'bg-stone-100/85 ring-1 ring-stone-200/80'
            }`}>
              {moment.likes.length > 0 && (
                <div className={`flex items-start gap-2 text-sm ${
                  isDarkMode ? 'text-zinc-200' : 'text-stone-700'
                } ${
                  moment.comments.length > 0
                    ? (isDarkMode ? 'border-b border-zinc-700 pb-2' : 'border-b border-stone-300 pb-2')
                    : ''
                }`}>
                  <HeartIcon className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`} />
                  <span className="leading-6">{moment.likes.join('，')}</span>
                </div>
              )}

              {moment.comments.length > 0 && (
                <div className="space-y-2 pt-2">
                  {moment.comments.map((comment) => (
                    <button
                      key={comment.id}
                      type="button"
                      className={`flex w-full items-start gap-2 rounded-xl p-1.5 text-left transition ${
                        isDarkMode ? 'hover:bg-zinc-800/45' : 'hover:bg-white/80'
                      }`}
                      onClick={() => onRequestComment(moment.id, comment.parent_id || comment.id, comment.user_name)}
                    >
                      <img
                        src={getCommentAvatar(comment.user_name)}
                        alt={`${comment.user_name}头像`}
                        className={`h-8 w-8 rounded-lg object-cover ring-1 ${
                          isDarkMode ? 'ring-zinc-700/70' : 'ring-stone-200'
                        }`}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[15px] font-semibold ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>{comment.user_name}</span>
                          <span className={`shrink-0 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-stone-500'}`}>
                            {format(new Date(comment.created_at), 'yyyy年M月d日 HH:mm')}
                          </span>
                        </div>
                        {(() => {
                          const parsed = parseMomentCommentContent(comment.content)
                          const hasText = Boolean(parsed.text) || Boolean(comment.reply_to_name)
                          return (
                            <>
                              {hasText && (
                                <p className={`whitespace-pre-wrap text-[15px] leading-6 ${
                                  isDarkMode ? 'text-zinc-200' : 'text-stone-700'
                                }`}>
                                  {comment.reply_to_name ? `回复${comment.reply_to_name}：` : ''}
                                  {parsed.text}
                                </p>
                              )}

                              {parsed.images.length > 0 && (
                                <div className="mt-1">
                                  {parsed.images.map((url, imageIndex) => (
                                    <img
                                      key={`${comment.id}-${url}-${imageIndex}`}
                                      src={resolveMediaUrl(url)}
                                      alt="评论图片"
                                      className={`h-20 w-20 cursor-zoom-in rounded-lg object-cover ring-1 ${
                                        isDarkMode ? 'ring-zinc-700/80' : 'ring-stone-200'
                                      }`}
                                      loading="lazy"
                                      decoding="async"
                                      onError={(event) => {
                                        const target = event.currentTarget
                                        target.style.display = 'none'
                                      }}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        window.open(resolveMediaUrl(url), '_blank', 'noopener,noreferrer')
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 backdrop-blur-sm"
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
