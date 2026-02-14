import React, { useState, useEffect } from 'react'
import Timeline from '../components/timeline/Timeline'
import MomentPublisher from '../components/timeline/MomentPublisher'
import {
  addMomentComment,
  createMoment,
  getMoments,
  Moment,
  toggleMomentLike,
} from '../services/momentService'

const TimelinePage: React.FC = () => {
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [pendingLikeMomentId, setPendingLikeMomentId] = useState<string | null>(null)
  const [pendingCommentMomentId, setPendingCommentMomentId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadMoments = async (pageNum: number) => {
    try {
      const response = await getMoments(pageNum)
      if (pageNum === 1) {
        setMoments(response.moments)
      } else {
        setMoments(prev => [...prev, ...response.moments])
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

  const handlePublish = async (payload: { content: string; image_urls: string[]; location?: string }) => {
    try {
      setPublishing(true)
      const created = await createMoment(payload)
      setMoments((prev) => [created, ...prev])
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

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadMoments(nextPage)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 md:space-y-5">
      <div className="surface-card overflow-hidden">
        <div className="relative h-44 bg-gradient-to-r from-sky-300 via-emerald-200 to-teal-300">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0)_45%)]" />
          <div className="absolute bottom-3 right-4 flex items-center gap-2">
            <span className="text-sm font-medium text-white drop-shadow">你</span>
            <img
              src="/user-avatar.svg"
              alt="你的头像"
              className="h-14 w-14 rounded-md border-2 border-white/90 object-cover shadow"
            />
          </div>
        </div>
      </div>

      <MomentPublisher publishing={publishing} onPublish={handlePublish} />

      <div className="px-1">
        <h1 className="text-base font-semibold text-stone-700">朋友圈</h1>
      </div>

      {loading && moments.length === 0 ? (
        <div className="surface-card flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
        </div>
      ) : (
        <>
          <Timeline
            moments={moments}
            onToggleLike={handleToggleLike}
            onCreateComment={handleCreateComment}
            pendingLikeMomentId={pendingLikeMomentId}
            pendingCommentMomentId={pendingCommentMomentId}
          />

          {hasMore && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-primary px-6"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default TimelinePage
