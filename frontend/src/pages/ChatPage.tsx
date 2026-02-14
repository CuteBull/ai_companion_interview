import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ClockIcon, PlusIcon, ArrowPathIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import ChatInterface from '../components/chat/ChatInterface'
import { Session, clearSessions, getSessions } from '../services/chatService'
import { useTheme } from '../contexts/ThemeContext'

const ChatPage: React.FC = () => {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const location = useLocation()
  const navigate = useNavigate()

  const [sessionId, setSessionId] = useState<string>()
  const [showHistory, setShowHistory] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [sessionError, setSessionError] = useState<string>()
  const [chatResetVersion, setChatResetVersion] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sid = params.get('sessionId')?.trim()
    setSessionId(sid || undefined)
  }, [location.search])

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === sessionId),
    [sessions, sessionId]
  )

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true)
    setSessionError(undefined)
    try {
      const response = await getSessions(1, 50)
      setSessions(response.sessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setSessionError('历史对话加载失败，请稍后重试')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    if (showHistory) {
      fetchSessions()
    }
  }, [showHistory, fetchSessions])

  const updateSessionInUrl = useCallback((nextSessionId?: string, replace: boolean = false) => {
    const params = new URLSearchParams(location.search)
    if (nextSessionId) {
      params.set('sessionId', nextSessionId)
    } else {
      params.delete('sessionId')
    }

    const query = params.toString()
    navigate(
      {
        pathname: '/chat',
        search: query ? `?${query}` : '',
      },
      { replace }
    )
  }, [location.search, navigate])

  const handleOpenNewChat = () => {
    setSessionId(undefined)
    setChatResetVersion((prev) => prev + 1)
    updateSessionInUrl(undefined, true)
    setShowHistory(false)
  }

  const handleSelectSession = (targetId: string) => {
    setSessionId(targetId)
    updateSessionInUrl(targetId)
    setShowHistory(false)
  }

  const handleSessionChange = useCallback((nextSessionId: string | undefined) => {
    if (!nextSessionId) return

    const currentSessionId = new URLSearchParams(location.search).get('sessionId') || undefined
    if (currentSessionId === nextSessionId) return

    updateSessionInUrl(nextSessionId, true)
    setSessionId(nextSessionId)
  }, [location.search, updateSessionInUrl])

  const handleClearHistory = useCallback(async () => {
    if (loadingSessions || clearingHistory) return

    const confirmed = window.confirm('确认清空全部历史对话吗？该操作不可撤销。')
    if (!confirmed) return

    setClearingHistory(true)
    setSessionError(undefined)

    try {
      await clearSessions()
      setSessions([])
      setSessionId(undefined)
      setChatResetVersion((prev) => prev + 1)
      updateSessionInUrl(undefined, true)
    } catch (error) {
      console.error('Failed to clear sessions:', error)
      setSessionError('清空历史对话失败，请稍后重试')
    } finally {
      setClearingHistory(false)
    }
  }, [clearingHistory, loadingSessions, updateSessionInUrl])

  const formatSessionTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return format(date, 'yyyy-MM-dd HH:mm')
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className={`text-sm ${isDarkMode ? 'text-zinc-300' : 'text-stone-600'}`}>
            {selectedSession
              ? `当前对话：${selectedSession.title || selectedSession.id.slice(0, 8)}`
              : '当前对话：新对话'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNewChat}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900/80 text-zinc-100 hover:bg-zinc-800'
                  : 'border-stone-300 bg-white/80 text-stone-700 hover:bg-white'
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              新对话
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
                isDarkMode
                  ? 'border-teal-700/80 bg-teal-900/40 text-teal-200 hover:bg-teal-900/60'
                  : 'border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              历史对话
            </button>
          </div>
        </div>

        <ChatInterface
          key={`chat-${chatResetVersion}`}
          sessionId={sessionId}
          onSessionChange={handleSessionChange}
        />
      </div>

      {showHistory && (
        <div
          className={`fixed inset-0 z-40 ${isDarkMode ? 'bg-black/55' : 'bg-black/35'}`}
          onClick={() => setShowHistory(false)}
        >
          <aside
            className={`absolute right-0 top-0 h-full w-full max-w-md border-l shadow-2xl ${
              isDarkMode ? 'border-zinc-700 bg-zinc-950' : 'border-stone-200 bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b px-4 py-3 ${
              isDarkMode ? 'border-zinc-700' : 'border-stone-200'
            }`}>
              <h2 className={`text-base font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`}>历史对话</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={loadingSessions || clearingHistory || sessions.length === 0}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                    isDarkMode
                      ? 'text-rose-300 hover:bg-rose-900/35 disabled:text-zinc-600 disabled:hover:bg-transparent'
                      : 'text-rose-600 hover:bg-rose-50 disabled:text-stone-400 disabled:hover:bg-transparent'
                  }`}
                  aria-label="清空历史对话"
                  title="清空历史对话"
                >
                  <TrashIcon className="h-4 w-4" />
                  {clearingHistory ? '清空中' : '清空'}
                </button>
                <button
                  type="button"
                  onClick={fetchSessions}
                  disabled={clearingHistory}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded disabled:opacity-50 ${
                    isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-stone-500 hover:bg-stone-100'
                  }`}
                  aria-label="刷新历史对话"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded ${
                    isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-stone-500 hover:bg-stone-100'
                  }`}
                  aria-label="关闭历史对话"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className={`border-b px-4 py-3 ${isDarkMode ? 'border-zinc-700' : 'border-stone-200'}`}>
              <button
                type="button"
                onClick={handleOpenNewChat}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  !sessionId
                    ? isDarkMode
                      ? 'border-teal-600 bg-teal-900/40 text-teal-100'
                      : 'border-teal-500 bg-teal-50 text-teal-700'
                    : isDarkMode
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                开启新对话
              </button>
            </div>

            <div className="h-[calc(100%-123px)] overflow-y-auto px-3 py-2">
              {loadingSessions ? (
                <div className={`py-10 text-center text-sm ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>加载中...</div>
              ) : sessionError ? (
                <div className="py-10 text-center text-sm text-rose-500">{sessionError}</div>
              ) : sessions.length === 0 ? (
                <div className={`py-10 text-center text-sm ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>暂无历史对话</div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const active = session.id === sessionId
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                          active
                            ? isDarkMode
                              ? 'border-teal-600 bg-teal-900/30'
                              : 'border-teal-400 bg-teal-50'
                            : isDarkMode
                              ? 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'
                              : 'border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                        >
                        <div className={`truncate text-sm font-medium ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`}>
                          {session.title || `对话 ${session.id.slice(0, 8)}`}
                        </div>
                        <div className={`mt-1 flex items-center justify-between text-xs ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>
                          <span>{formatSessionTime(session.created_at)}</span>
                          <span>{session.message_count} 条消息</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

export default ChatPage
