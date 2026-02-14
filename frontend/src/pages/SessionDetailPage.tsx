import React, { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import MessageList from '../components/chat/MessageList'
import { Message, getSessionMessages } from '../services/chatService'
import ThemeSwitcher from '../components/layout/ThemeSwitcher'
import { useTheme } from '../contexts/ThemeContext'

const SessionDetailPage: React.FC = () => {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const { sessionId } = useParams<{ sessionId: string }>()
  const [title, setTitle] = useState('会话详情')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const loadSessionDetail = async () => {
      if (!sessionId) return

      setLoading(true)
      setError(undefined)

      try {
        const sessionData = await getSessionMessages(sessionId)
        setTitle(sessionData.session.title || '未命名会话')
        setMessages(sessionData.messages)
      } catch (err) {
        console.error('Failed to load session detail:', err)
        setError('加载详情失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    loadSessionDetail()
  }, [sessionId])

  if (!sessionId) {
    return <Navigate to="/timeline" replace />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="surface-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`}>{title}</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>{messages.length} 条消息</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ThemeSwitcher compact />
          <Link
            to="/timeline"
            className="btn-secondary"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回朋友圈
          </Link>
          <Link
            to={`/chat?sessionId=${sessionId}`}
            className="btn-primary"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
            继续对话
          </Link>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="h-[70vh] min-h-[520px] overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkMode ? 'border-teal-300' : 'border-teal-700'}`} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-rose-500">{error}</div>
          ) : messages.length === 0 ? (
            <div className={`panel-muted text-center py-12 ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>该会话暂无消息</div>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>
      </div>
    </div>
  )
}

export default SessionDetailPage
