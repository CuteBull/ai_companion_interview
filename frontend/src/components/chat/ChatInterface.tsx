import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import InputArea from './InputArea'
import { getSessionMessages, streamChat } from '../../services/chatService'
import { Message } from '../../services/chatService'

interface ChatInterfaceProps {
  sessionId?: string
  onSessionChange?: (sessionId: string | undefined) => void
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, onSessionChange }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const skipNextHistoryLoadSessionRef = useRef<string | null>(null)
  const currentSessionIdRef = useRef<string | undefined>(sessionId)
  const hasMessagesRef = useRef(false)

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    hasMessagesRef.current = messages.length > 0
  }, [messages.length])

  // 滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    // 仅在消息数量变化时平滑滚动，避免流式分片导致频繁动画卡顿
    scrollToBottom('smooth')
  }, [messages.length])

  // 加载指定会话的历史消息
  useEffect(() => {
    let isCancelled = false

    const loadHistory = async () => {
      if (!sessionId) {
        setCurrentSessionId(undefined)
        setMessages([])
        return
      }

      // 新会话流式过程中刚拿到sessionId时，跳过一次历史回灌，避免覆盖正在生成的AI消息
      if (skipNextHistoryLoadSessionRef.current === sessionId) {
        skipNextHistoryLoadSessionRef.current = null
        return
      }

      // 当前已在同一会话并有消息时，不重复回灌历史
      if (sessionId === currentSessionIdRef.current && hasMessagesRef.current) {
        return
      }

      setCurrentSessionId(sessionId)
      setIsLoadingHistory(true)
      try {
        const sessionData = await getSessionMessages(sessionId)
        if (!isCancelled) {
          setMessages(sessionData.messages)
        }
      } catch (error) {
        console.error('Failed to load session history:', error)
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false)
        }
      }
    }

    loadHistory()

    return () => {
      isCancelled = true
    }
  }, [sessionId])

  // 处理发送消息
  const handleSendMessage = async (
    message: string,
    imageUrls?: string[]
  ) => {
    const nowIso = new Date().toISOString()
    const baseId = Date.now().toString()
    const aiMessageId = `${baseId}-ai`

    // 添加用户消息
    const userMessage: Message = {
      id: baseId,
      role: 'user',
      content: message,
      image_urls: imageUrls,
      created_at: nowIso,
    }

    // 同步插入用户消息和占位符AI消息，减少一次重渲染
    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        created_at: nowIso,
      },
    ])
    scrollToBottom('auto')

    setIsSending(true)

    try {
      let aiResponse = ''
      let streamErrored = false
      let flushTimer: number | null = null

      const flushAssistantContent = () => {
        flushTimer = null
        setMessages((prev) => {
          if (prev.length === 0) return prev
          const last = prev[prev.length - 1]

          if (last.id === aiMessageId) {
            if (last.content === aiResponse) return prev
            const next = [...prev]
            next[next.length - 1] = { ...last, content: aiResponse }
            return next
          }

          return prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: aiResponse } : msg
          )
        })
        scrollToBottom('auto')
      }

      const scheduleFlush = () => {
        if (flushTimer !== null || streamErrored) return
        flushTimer = window.setTimeout(flushAssistantContent, 40)
      }

      await streamChat(
        {
          session_id: currentSessionId,
          message,
          image_urls: imageUrls,
        },
        (chunk) => {
          if (streamErrored) return
          aiResponse += chunk
          scheduleFlush()
        },
        (newSessionId) => {
          setCurrentSessionId(newSessionId)
          skipNextHistoryLoadSessionRef.current = newSessionId
          onSessionChange?.(newSessionId)
        },
        (error) => {
          streamErrored = true
          if (flushTimer !== null) {
            window.clearTimeout(flushTimer)
            flushTimer = null
          }
          console.error('Chat error:', error)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: `错误: ${error.message}` }
                : msg
            )
          )
          scrollToBottom('auto')
        }
      )

      if (!streamErrored) {
        if (flushTimer !== null) {
          window.clearTimeout(flushTimer)
          flushTimer = null
        }
        flushAssistantContent()
      }
    } catch (error) {
      console.error('Chat failed:', error)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="surface-card overflow-hidden" role="main">
      <div className="relative flex h-[70vh] min-h-[520px] flex-col">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-50/70 to-transparent" />
        <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3 md:px-6">
          <MessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {(isLoadingHistory || isSending) && (
          <div className="border-t border-teal-100 bg-teal-50/60 p-3">
            <div className="text-center text-sm font-medium text-teal-700">
              {isLoadingHistory ? '加载历史消息...' : '正在思考...'}
            </div>
          </div>
        )}
        <div className="border-t border-stone-200/80 bg-white/70 p-4 md:p-5">
          <InputArea onSend={handleSendMessage} isLoading={isSending || isLoadingHistory} />
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
