import React, { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import InputArea from './InputArea'
import { getSessionMessages, streamChat } from '../../services/chatService'
import { Message } from '../../services/chatService'

interface ChatInterfaceProps {
  sessionId?: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载指定会话的历史消息
  useEffect(() => {
    let isCancelled = false

    const loadHistory = async () => {
      if (!sessionId) {
        setCurrentSessionId(undefined)
        setMessages([])
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
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      image_urls: imageUrls,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    // 添加占位符AI消息
    const aiMessageId = Date.now().toString() + '-ai'
    setMessages(prev => [
      ...prev,
      {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      },
    ])

    setIsSending(true)

    try {
      let aiResponse = ''

      await streamChat(
        {
          session_id: currentSessionId,
          message,
          image_urls: imageUrls,
        },
        (chunk) => {
          aiResponse += chunk
          // 更新AI消息内容
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: aiResponse }
                : msg
            )
          )
        },
        (newSessionId) => {
          setCurrentSessionId(newSessionId)
        },
        (error) => {
          console.error('Chat error:', error)
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: `错误: ${error.message}` }
                : msg
            )
          )
        }
      )
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
