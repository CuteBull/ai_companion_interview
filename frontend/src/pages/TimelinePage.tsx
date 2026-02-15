import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  EllipsisHorizontalIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import Timeline from '../components/timeline/Timeline'
import MomentPublisher from '../components/timeline/MomentPublisher'
import {
  addMomentComment,
  createMoment,
  deleteMoment,
  getMoments,
  Moment,
  toggleMomentLike,
  updateMomentAvatarForUser,
} from '../services/momentService'
import { uploadFile } from '../services/api'
import {
  DEFAULT_AVATAR_URL,
  TIMELINE_AVATAR_STORAGE_KEY,
} from '../constants/avatarOptions'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { encodeMomentCommentContent } from '../utils/commentMedia'
import { extractErrorMessage } from '../utils/errorMessage'
import ThemeSwitcher from '../components/layout/ThemeSwitcher'
import { useTheme } from '../contexts/ThemeContext'

interface CommentTarget {
  momentId: string
  parentId?: string
  replyToName?: string
}

const COMMENT_EMOJIS = ['🙂', '🥺', '🤗', '❤️', '✨', '😭', '😂', '👍', '🙏', '🌈']

const TimelinePage: React.FC = () => {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [showPublisher, setShowPublisher] = useState(false)
  const [pendingLikeMomentId, setPendingLikeMomentId] = useState<string | null>(null)
  const [pendingCommentMomentId, setPendingCommentMomentId] = useState<string | null>(null)
  const [pendingDeleteMomentId, setPendingDeleteMomentId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR_URL)
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null)
  const [commentText, setCommentText] = useState('')
  const [commentImageUrl, setCommentImageUrl] = useState<string | null>(null)
  const [commentImageUploading, setCommentImageUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const commentImageInputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const loadMoments = async (pageNum: number) => {
    if (pageNum === 1) {
      setLoading(true)
    }
    setLoadError(null)
    try {
      const response = await getMoments(pageNum)
      if (pageNum === 1) {
        setMoments(response.moments)
      } else {
        setMoments((prev) => [...prev, ...response.moments])
      }
      setHasMore(response.has_more)
    } catch (error) {
      console.error('Failed to load moments:', error)
      if (pageNum === 1) {
        setLoadError(`加载失败：${extractErrorMessage(error, '请稍后重试')}`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMoments(1)
  }, [])

  useEffect(() => {
    const storedAvatar = localStorage.getItem(TIMELINE_AVATAR_STORAGE_KEY)
    if (storedAvatar && storedAvatar.trim()) {
      setSelectedAvatar(storedAvatar.trim())
    }
  }, [])

  useEffect(() => {
    if (!commentTarget) return
    const timer = window.setTimeout(() => {
      commentInputRef.current?.focus()
    }, 30)
    return () => window.clearTimeout(timer)
  }, [commentTarget])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const commentPlaceholder = useMemo(() => {
    if (!commentTarget) return '先点某条动态的“评论”再输入'
    if (commentTarget.replyToName) return `回复 ${commentTarget.replyToName}`
    return '发表评论...'
  }, [commentTarget])

  const handleAvatarChange = async (avatarUrl: string) => {
    const normalized = avatarUrl.trim() || DEFAULT_AVATAR_URL
    setSelectedAvatar(normalized)
    localStorage.setItem(TIMELINE_AVATAR_STORAGE_KEY, normalized)

    setMoments((prev) =>
      prev.map((item) =>
        item.author_name === '你'
          ? { ...item, author_avatar_url: normalized }
          : item
      )
    )

    try {
      await updateMomentAvatarForUser(normalized, '你')
    } catch (error) {
      console.error('Update historical avatar failed:', error)
    }
  }

  const handlePublish = async (payload: {
    content: string
    image_urls: string[]
    location?: string
    author_avatar_url: string
  }) => {
    try {
      setPublishing(true)
      const created = await createMoment(payload)
      setMoments((prev) => [created, ...prev])
      setShowPublisher(false)
    } catch (error) {
      console.error('Publish moment failed:', error)
      alert('发布失败，请稍后重试')
    } finally {
      setPublishing(false)
    }
  }

  const handleToggleLike = async (momentId: string) => {
    const snapshot = moments
    setPendingLikeMomentId(momentId)

    const target = moments.find((item) => item.id === momentId)
    if (!target) return
    const optimisticLiked = !target.liked_by_me
    const optimisticLikes = optimisticLiked
      ? [...target.likes, '你']
      : target.likes.filter((name) => name !== '你')

    setMoments((prev) =>
      prev.map((item) =>
        item.id === momentId
          ? {
              ...item,
              liked_by_me: optimisticLiked,
              likes: optimisticLikes,
              like_count: optimisticLikes.length,
            }
          : item
      )
    )

    try {
      const result = await toggleMomentLike(momentId, '你')
      setMoments((prev) =>
        prev.map((item) =>
          item.id === momentId
            ? {
                ...item,
                liked_by_me: result.liked,
                likes: result.likes,
                like_count: result.like_count,
              }
            : item
        )
      )
    } catch (error) {
      console.error('Toggle like failed:', error)
      setMoments(snapshot)
      alert('点赞失败，请稍后重试')
    } finally {
      setPendingLikeMomentId(null)
    }
  }

  const handleCreateComment = async (
    momentId: string,
    content: string,
    parentId?: string,
    replyToName?: string
  ) => {
    setPendingCommentMomentId(momentId)
    try {
      const created = await addMomentComment(momentId, {
        content,
        parent_id: parentId,
        reply_to_name: replyToName,
        user_name: '你',
      })

      setMoments((prev) =>
        prev.map((item) =>
          item.id === momentId
            ? {
                ...item,
                comments: [...item.comments, created],
                comment_count: item.comment_count + 1,
              }
            : item
        )
      )
    } catch (error) {
      console.error('Comment moment failed:', error)
      alert('评论失败，请稍后重试')
    } finally {
      setPendingCommentMomentId(null)
    }
  }

  const handleRequestComment = (momentId: string, parentId?: string, replyToName?: string) => {
    setCommentTarget({
      momentId,
      parentId,
      replyToName,
    })
  }

  const handleSubmitComment = async () => {
    if (!commentTarget || pendingCommentMomentId || commentImageUploading) return
    const content = encodeMomentCommentContent(commentText, commentImageUrl ? [commentImageUrl] : [])
    if (!content) return
    if (content.length > 1000) {
      alert('评论内容过长，请缩短文字或减少图片信息')
      return
    }

    await handleCreateComment(
      commentTarget.momentId,
      content,
      commentTarget.parentId,
      commentTarget.replyToName
    )

    setCommentText('')
    setCommentImageUrl(null)
    setShowEmojiPicker(false)
    setCommentTarget(null)
  }

  const handleSelectEmoji = (emoji: string) => {
    setCommentText((prev) => {
      const next = `${prev}${emoji}`
      return next.length > 1000 ? prev : next
    })
    setShowEmojiPicker(false)
    window.requestAnimationFrame(() => {
      commentInputRef.current?.focus()
    })
  }

  const handlePickCommentImage = () => {
    commentImageInputRef.current?.click()
  }

  const handleCommentImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setCommentImageUploading(true)
    try {
      const uploaded = await uploadFile(file)
      setCommentImageUrl(uploaded.url)
      if (uploaded.storage === 'local') {
        alert('当前评论图片使用临时本地存储，服务重启或重新部署后可能失效。')
      }
    } catch (error) {
      console.error('Upload comment image failed:', error)
      alert(`评论图片上传失败：${extractErrorMessage(error, '请稍后再试')}`)
    } finally {
      setCommentImageUploading(false)
      commentInputRef.current?.focus()
    }
  }

  const handleDeleteMoment = async (momentId: string) => {
    const snapshot = moments
    setPendingDeleteMomentId(momentId)
    setMoments((prev) => prev.filter((item) => item.id !== momentId))

    try {
      await deleteMoment(momentId, '你')
    } catch (error) {
      console.error('Delete moment failed:', error)
      setMoments(snapshot)
      alert('删除失败，请稍后重试')
    } finally {
      setPendingDeleteMomentId(null)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadMoments(nextPage)
  }

  const commentDisabled = !commentTarget || (!commentText.trim() && !commentImageUrl) || Boolean(pendingCommentMomentId) || commentImageUploading

  return (
    <div className={`relative mx-auto min-h-screen w-full max-w-[480px] overflow-hidden ${isDarkMode ? 'bg-[#05060b] text-zinc-100' : 'bg-[#f6f4ee] text-stone-900'}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${
          isDarkMode ? 'bg-cyan-500/20' : 'bg-teal-300/30'
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -left-24 top-72 h-72 w-72 rounded-full blur-3xl ${
          isDarkMode ? 'bg-fuchsia-500/10' : 'bg-amber-300/30'
        }`}
      />

      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${isDarkMode ? 'border-zinc-800/90 bg-zinc-950/88 shadow-[0_12px_28px_rgba(2,6,23,0.5)]' : 'border-white/70 bg-white/76 shadow-[0_12px_30px_rgba(120,53,15,0.1)]'}`}>
        <div className="grid grid-cols-[2.6rem_1fr_auto] items-center px-4 py-3">
          <Link
            to="/chat"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${
              isDarkMode ? 'text-zinc-200 hover:bg-zinc-800/80' : 'text-stone-700 hover:bg-stone-100'
            }`}
            aria-label="返回对话"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h1 className={`text-center text-[1.95rem] font-semibold tracking-[0.14em] ${isDarkMode ? 'text-zinc-100 drop-shadow-[0_2px_10px_rgba(56,189,248,0.25)]' : 'text-stone-900'}`}>朋友圈</h1>
          <div className="flex items-center justify-end gap-2">
            <ThemeSwitcher compact />
            <button
              type="button"
              onClick={() => setShowPublisher((prev) => !prev)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${
                isDarkMode ? 'text-zinc-200 hover:bg-zinc-800/80' : 'text-stone-700 hover:bg-stone-100'
              }`}
              aria-label="更多"
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-4 px-4 pb-28 pt-4">
        {showPublisher && (
          <MomentPublisher
            publishing={publishing}
            selectedAvatar={selectedAvatar}
            isDarkMode={isDarkMode}
            onAvatarChange={handleAvatarChange}
            onPublish={handlePublish}
          />
        )}

        {!showPublisher && (
          <div className={`fade-rise rounded-3xl border px-3 py-2.5 shadow-lg ${
            isDarkMode
              ? 'border-zinc-800 bg-zinc-900/70 shadow-black/35'
              : 'border-white/70 bg-white/82 shadow-stone-400/20 backdrop-blur-md'
          }`}>
            <button
              type="button"
              onClick={() => setShowPublisher(true)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                isDarkMode
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-zinc-300 hover:from-zinc-800 hover:to-zinc-800'
                  : 'bg-gradient-to-r from-teal-50 via-stone-100 to-amber-50 text-stone-700 hover:from-teal-100 hover:to-amber-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <img
                  src={resolveMediaUrl(selectedAvatar)}
                  alt="你的头像"
                  className={`h-8 w-8 rounded-lg object-cover ring-1 ${
                    isDarkMode ? 'ring-zinc-700/80' : 'ring-stone-200'
                  }`}
                />
                发朋友圈
              </span>
              <span className={isDarkMode ? 'text-zinc-400' : 'text-stone-500'}>写这一刻</span>
            </button>
          </div>
        )}

        {loading && moments.length === 0 ? (
          <div className="flex justify-center py-14">
            <div className={`h-10 w-10 animate-spin rounded-full border-2 ${
              isDarkMode ? 'border-zinc-700 border-t-zinc-200' : 'border-stone-300 border-t-teal-600'
            }`} />
          </div>
        ) : loadError && moments.length === 0 ? (
          <div className={`fade-rise rounded-3xl border px-4 py-12 text-center shadow-xl ${
            isDarkMode
              ? 'border-zinc-800 bg-zinc-900/72 text-zinc-300 shadow-black/30'
              : 'border-white/70 bg-white/84 text-stone-600 shadow-stone-400/20'
          }`}>
            <div className={`text-base font-medium ${isDarkMode ? 'text-zinc-200' : 'text-stone-800'}`}>{loadError}</div>
            <button
              type="button"
              onClick={() => loadMoments(1)}
              className={`mt-4 rounded-full border px-5 py-2 text-sm transition ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              重新加载
            </button>
          </div>
        ) : (
          <>
            <Timeline
              moments={moments}
              currentUserAvatar={selectedAvatar}
              isDarkMode={isDarkMode}
              onToggleLike={handleToggleLike}
              onRequestComment={handleRequestComment}
              onDeleteMoment={handleDeleteMoment}
              pendingLikeMomentId={pendingLikeMomentId}
              activeCommentMomentId={commentTarget?.momentId ?? null}
              pendingDeleteMomentId={pendingDeleteMomentId}
            />

            {hasMore && (
              <div className="text-center pt-1">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`rounded-full border px-6 py-2 text-sm shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      : 'border-stone-300 bg-white/95 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <div className={`fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl ${isDarkMode ? 'border-zinc-800/90 bg-zinc-950/92' : 'border-white/70 bg-white/78 shadow-[0_-10px_28px_rgba(120,53,15,0.08)]'}`}>
        <div className="mx-auto w-full max-w-[480px] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {commentTarget && (
            <div className={`mb-1 flex items-center justify-between text-xs ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>
              <span>
                {commentTarget.replyToName
                  ? `正在回复：${commentTarget.replyToName}`
                  : '正在评论这条动态'}
              </span>
              <button
                type="button"
                onClick={() => setCommentTarget(null)}
                className={isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-stone-500 hover:text-stone-700'}
              >
                取消
              </button>
            </div>
          )}

          {commentImageUrl && (
            <div className={`mb-2 inline-flex items-center gap-2 rounded-lg border px-2 py-1 ${
              isDarkMode ? 'border-zinc-700 bg-zinc-900' : 'border-stone-300 bg-white'
            }`}>
              <img
                src={resolveMediaUrl(commentImageUrl)}
                alt="评论图片预览"
                className={`h-10 w-10 rounded-md object-cover ring-1 ${
                  isDarkMode ? 'ring-zinc-700/80' : 'ring-stone-200'
                }`}
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                onClick={() => setCommentImageUrl(null)}
                className={`text-xs ${
                  isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                移除
              </button>
            </div>
          )}

          <div className={`relative flex items-center gap-2 rounded-2xl p-1 ${
            isDarkMode ? 'bg-zinc-900/70' : 'bg-white/80 shadow-sm'
          }`}>
            <div ref={emojiPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                  isDarkMode
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    : 'border-stone-300 bg-white text-stone-500 hover:bg-stone-100'
                }`}
                aria-label="插入表情"
              >
                <FaceSmileIcon className="h-6 w-6" />
              </button>

              {showEmojiPicker && (
                <div className={`absolute bottom-11 left-0 z-40 w-48 rounded-lg border p-2 shadow-2xl ${
                  isDarkMode ? 'border-zinc-700 bg-zinc-900' : 'border-stone-300 bg-white'
                }`}>
                  <div className="grid grid-cols-5 gap-1">
                    {COMMENT_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className={`rounded px-1 py-1 text-xl ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-stone-100'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  handleSubmitComment()
                }
              }}
              placeholder={commentPlaceholder}
              maxLength={1000}
              className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500'
                  : 'border-stone-300 bg-white text-stone-800 placeholder:text-stone-400 focus:border-teal-500'
              }`}
            />
            <button
              type="button"
              onClick={handlePickCommentImage}
              disabled={commentImageUploading}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  : 'border-stone-300 bg-white text-stone-500 hover:bg-stone-100'
              }`}
              aria-label="附加图片"
              title="上传评论图片"
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={commentDisabled}
              className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                isDarkMode
                  ? 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600'
                  : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {commentImageUploading ? '上传中...' : '发送'}
            </button>
            <input
              ref={commentImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCommentImageSelected}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimelinePage
