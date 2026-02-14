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
import {
  DEFAULT_AVATAR_URL,
  TIMELINE_AVATAR_STORAGE_KEY,
} from '../constants/avatarOptions'
import { resolveMediaUrl } from '../utils/mediaUrl'

interface CommentTarget {
  momentId: string
  parentId?: string
  replyToName?: string
}

const TimelinePage: React.FC = () => {
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
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
  const commentInputRef = useRef<HTMLInputElement>(null)

  const loadMoments = async (pageNum: number) => {
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
    const content = commentText.trim()
    if (!commentTarget || !content || pendingCommentMomentId) return

    await handleCreateComment(
      commentTarget.momentId,
      content,
      commentTarget.parentId,
      commentTarget.replyToName
    )

    setCommentText('')
    setCommentTarget(null)
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

  const commentDisabled = !commentTarget || !commentText.trim() || Boolean(pendingCommentMomentId)

  return (
    <div className="mx-auto min-h-screen w-full max-w-[460px] bg-black text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-black/95 backdrop-blur">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-3 py-2.5">
          <Link
            to="/chat"
            className="inline-flex h-9 w-9 items-center justify-center rounded text-zinc-200 hover:bg-zinc-900"
            aria-label="返回对话"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-xl font-semibold tracking-wide text-zinc-100">详情</h1>
          <button
            type="button"
            onClick={() => setShowPublisher((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-zinc-200 hover:bg-zinc-900"
            aria-label="更多"
          >
            <EllipsisHorizontalIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-24 pt-4">
        {showPublisher && (
          <MomentPublisher
            publishing={publishing}
            selectedAvatar={selectedAvatar}
            onAvatarChange={handleAvatarChange}
            onPublish={handlePublish}
          />
        )}

        {!showPublisher && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowPublisher(true)}
              className="flex w-full items-center justify-between rounded-lg bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
            >
              <span className="inline-flex items-center gap-2">
                <img
                  src={resolveMediaUrl(selectedAvatar)}
                  alt="你的头像"
                  className="h-8 w-8 rounded-md object-cover"
                />
                发朋友圈
              </span>
              <span className="text-zinc-400">写这一刻</span>
            </button>
          </div>
        )}

        {loading && moments.length === 0 ? (
          <div className="flex justify-center py-14">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
          </div>
        ) : (
          <>
            <Timeline
              moments={moments}
              currentUserAvatar={selectedAvatar}
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
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800 bg-black/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[460px] px-3 py-2">
          {commentTarget && (
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
              <span>
                {commentTarget.replyToName
                  ? `正在回复：${commentTarget.replyToName}`
                  : '正在评论这条动态'}
              </span>
              <button
                type="button"
                onClick={() => setCommentTarget(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                取消
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <FaceSmileIcon className="h-7 w-7 text-zinc-500" />
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
              className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              aria-label="附加图片"
              title="评论暂不支持图片"
            >
              <PhotoIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={commentDisabled}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-zinc-700 px-3 text-sm font-medium text-zinc-100 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimelinePage
