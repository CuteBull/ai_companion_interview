import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import ChatInterface from './ChatInterface'
import { getSessionMessages, streamChat } from '../../services/chatService'
import { ThemeProvider } from '../../contexts/ThemeContext'

// 模拟chatService
vi.mock('../../services/chatService', () => ({
  streamChat: vi.fn(),
  getSessionMessages: vi.fn(),
}))

const renderWithTheme = (ui: ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  )
}

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSessionMessages).mockResolvedValue({
      session: {
        id: 'test-session-123',
        title: '测试会话',
      },
      messages: [],
    })
  })

  it('渲染空聊天界面', () => {
    renderWithTheme(<ChatInterface />)

    // 检查界面元素
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/输入消息/i)).toBeInTheDocument()
  })

  it('带会话ID时会加载历史且不显示会话ID', async () => {
    renderWithTheme(<ChatInterface sessionId="test-session-123" />)

    expect(screen.queryByText(/会话ID:/i)).not.toBeInTheDocument()
    await waitFor(() => {
      expect(getSessionMessages).toHaveBeenCalledWith('test-session-123')
    })
  })

  it('加载会话历史消息', async () => {
    vi.mocked(getSessionMessages).mockResolvedValueOnce({
      session: {
        id: 'history-session',
        title: '历史会话',
      },
      messages: [
        {
          id: 'history-msg-1',
          role: 'assistant',
          content: '历史消息内容',
          created_at: '2026-02-14T09:00:00.000Z',
          image_urls: null,
          audio_text: null,
        },
      ],
    })

    renderWithTheme(<ChatInterface sessionId="history-session" />)

    await waitFor(() => {
      expect(getSessionMessages).toHaveBeenCalledWith('history-session')
      expect(screen.getByText('历史消息内容')).toBeInTheDocument()
    })
  })

  it('发送文本消息', async () => {
    // 模拟streamChat调用回调
    vi.mocked(streamChat).mockImplementation(async (_request, onChunk, onComplete, _onError) => {
      // 模拟立即返回一些数据
      onChunk('Hello!')
      onComplete('new-session-id')
      return 'Hello!'
    })

    renderWithTheme(<ChatInterface />)

    // 输入消息
    const input = screen.getByPlaceholderText(/输入消息/i)
    fireEvent.change(input, { target: { value: 'Hello AI' } })

    // 点击发送按钮
    const sendButton = screen.getByRole('button', { name: /发送消息/i })
    fireEvent.click(sendButton)

    // 检查消息是否添加到界面
    await waitFor(() => {
      expect(screen.getByText(/Hello AI/i)).toBeInTheDocument()
    })

    // 检查AI响应是否显示
    await waitFor(() => {
      expect(screen.getByText(/Hello!/i)).toBeInTheDocument()
    })

    // 检查是否调用了streamChat（第一个参数）
    expect(streamChat).toHaveBeenCalled()
    const call = vi.mocked(streamChat).mock.calls[0]
    expect(call[0]).toEqual(expect.objectContaining({
      message: 'Hello AI',
      session_id: undefined,
      image_urls: [],
    }))
    // 检查回调函数存在
    expect(typeof call[1]).toBe('function') // onChunk
    expect(typeof call[2]).toBe('function') // onComplete
    expect(typeof call[3]).toBe('function') // onError
  })

  it('处理流式响应', async () => {
    // 模拟流式响应
    vi.mocked(streamChat).mockImplementation(async (_request, onChunk, onComplete, _onError) => {
      // 模拟流式块
      setTimeout(() => onChunk('Hello'), 10)
      setTimeout(() => onChunk(' World'), 20)
      setTimeout(() => onChunk('!'), 30)
      setTimeout(() => onComplete('session-id'), 40)
      return 'Hello World!'
    })

    renderWithTheme(<ChatInterface />)

    // 发送消息
    const input = screen.getByPlaceholderText(/输入消息/i)
    fireEvent.change(input, { target: { value: 'Hi' } })
    const sendButton = screen.getByRole('button', { name: /发送消息/i })
    fireEvent.click(sendButton)

    // 检查AI响应是否逐步显示
    await waitFor(() => {
      expect(screen.getByText(/Hello World!/i)).toBeInTheDocument()
    })
  })

  it('显示加载状态', async () => {
    // 模拟streamChat延迟响应
    vi.mocked(streamChat).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('response'), 100))
    )

    renderWithTheme(<ChatInterface />)

    // 发送消息
    const input = screen.getByPlaceholderText(/输入消息/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    const sendButton = screen.getByRole('button', { name: /发送消息/i })
    fireEvent.click(sendButton)

    // 检查加载状态
    expect(screen.getByText(/正在思考/i)).toBeInTheDocument()
  })

  it('处理错误', async () => {
    // 模拟streamChat调用onError回调
    vi.mocked(streamChat).mockImplementation(async (_request, _onChunk, _onComplete, onError) => {
      onError(new Error('API Error'))
      throw new Error('API Error')
    })

    renderWithTheme(<ChatInterface />)

    // 发送消息
    const input = screen.getByPlaceholderText(/输入消息/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    const sendButton = screen.getByRole('button', { name: /发送消息/i })
    fireEvent.click(sendButton)

    // 检查错误处理
    await waitFor(() => {
      expect(screen.getByText(/错误:/i)).toBeInTheDocument()
    })
  })
})
