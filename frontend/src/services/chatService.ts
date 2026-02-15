import api from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY

export interface ChatRequest {
  session_id?: string
  message: string
  image_urls?: string[]
  audio_text?: string
}

export interface Session {
  id: string
  title: string
  created_at: string
  message_count: number
  preview_image?: string
}

export interface SessionsResponse {
  sessions: Session[]
  total: number
  page: number
  limit: number
}

export interface ClearSessionsResponse {
  deleted_sessions: number
  deleted_messages: number
  detached_moments: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_urls?: string[] | null
  audio_text?: string | null
  created_at: string
}

export interface SessionMessages {
  session: {
    id: string
    title: string
  }
  messages: Message[]
}

export interface SessionToMomentRequest {
  author_name?: string
  author_avatar_url?: string
  location?: string
}

export interface SessionToMomentResponse {
  id: string
  session_id?: string | null
}

// 流式聊天
export const streamChat = async (
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onComplete: (sessionId: string) => void,
  onError: (error: Error) => void
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let sessionId = ''
    let fullText = ''
    let eventBuffer = ''

    const processEvent = (rawEvent: string) => {
      if (!rawEvent) return

      const lines = rawEvent.split('\n')
      let eventData = ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trimStart()
          eventData = eventData ? `${eventData}\n${payload}` : payload
          continue
        }

        // 兼容后端 chunk 中携带换行但未逐行加 data: 前缀的情况
        if (eventData) {
          eventData += `\n${line}`
        }
      }

      if (!eventData) return

      if (eventData.startsWith('session:')) {
        sessionId = eventData.slice(8).trim()
        if (sessionId) {
          onComplete(sessionId)
        }
      } else {
        fullText += eventData
        onChunk(eventData)
      }
    }

    while (true) {
      const { done, value } = await reader.read()

      if (value) {
        eventBuffer += decoder.decode(value, { stream: !done })
      }

      let boundaryIndex = eventBuffer.indexOf('\n\n')
      while (boundaryIndex !== -1) {
        const rawEvent = eventBuffer.slice(0, boundaryIndex)
        processEvent(rawEvent)
        eventBuffer = eventBuffer.slice(boundaryIndex + 2)
        boundaryIndex = eventBuffer.indexOf('\n\n')
      }

      if (done) {
        // 兜底处理最后一个事件（如果没有以双换行结束）
        processEvent(eventBuffer)
        break
      }
    }

    return fullText

  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'))
    throw error
  }
}

// 获取会话列表
export const getSessions = async (page: number = 1, limit: number = 20): Promise<SessionsResponse> => {
  const response = await api.get('/api/sessions', {
    params: { page, limit },
  })
  return response.data
}

// 获取会话消息
export const getSessionMessages = async (sessionId: string): Promise<SessionMessages> => {
  const response = await api.get(`/api/sessions/${sessionId}/messages`)
  return response.data
}

// 清空历史对话
export const clearSessions = async (): Promise<ClearSessionsResponse> => {
  const response = await api.delete('/api/sessions')
  return response.data
}

// 从历史对话生成朋友圈
export const createMomentFromSession = async (
  sessionId: string,
  payload: SessionToMomentRequest = {}
): Promise<SessionToMomentResponse> => {
  const response = await api.post(`/api/sessions/${sessionId}/moment`, payload)
  return response.data
}
