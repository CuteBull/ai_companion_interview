import React, { useState, useEffect } from 'react'
import Timeline from '../components/timeline/Timeline'
import { getSessions } from '../services/chatService'
import { Session } from '../services/chatService'

const TimelinePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const loadSessions = async (pageNum: number) => {
    try {
      const response = await getSessions(pageNum)
      if (pageNum === 1) {
        setSessions(response.sessions)
      } else {
        setSessions(prev => [...prev, ...response.sessions])
      }
      setHasMore(response.sessions.length > 0)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions(1)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadSessions(nextPage)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="surface-card p-5 md:p-6">
        <h1 className="text-3xl font-bold text-stone-900">对话朋友圈</h1>
        <p className="mt-2 text-sm text-stone-600">
          按时间浏览你的会话，随时点开详情或继续对话。
        </p>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="surface-card flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
        </div>
      ) : (
        <>
          <Timeline sessions={sessions} />

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
