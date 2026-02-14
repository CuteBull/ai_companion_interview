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
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data.startsWith('session:')) {
            sessionId = data.slice(8)
            onComplete(sessionId)
          } else {
            buffer += data
            onChunk(data)
          }
        }
      }
    }

    return buffer

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
