import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageItem from './MessageItem'

describe('MessageItem', () => {
  it('渲染用户消息', () => {
    const userMessage = {
      id: '1',
      role: 'user' as const,
      content: '你好，世界！',
      created_at: '2024-01-01T12:00:00Z',
      image_urls: [],
      audio_text: null
    }

    render(<MessageItem message={userMessage} />)

    // 检查基本元素
    expect(screen.getByText('你')).toBeInTheDocument()
    expect(screen.getByText('你好，世界！')).toBeInTheDocument()
  })

  it('渲染AI消息', () => {
    const aiMessage = {
      id: '2',
      role: 'assistant' as const,
      content: '你好！我是AI陪伴助手。',
      created_at: '2024-01-01T12:01:00Z',
      image_urls: [],
      audio_text: null
    }

    render(<MessageItem message={aiMessage} />)

    // 检查基本元素
    expect(screen.getByText('AI陪伴助手')).toBeInTheDocument()
    expect(screen.getByText('你好！我是AI陪伴助手。')).toBeInTheDocument()
  })

  it('渲染AI消息中的加粗Markdown', () => {
    const aiMessage = {
      id: '2-1',
      role: 'assistant' as const,
      content: '这里有**重点内容**需要强调',
      created_at: '2024-01-01T12:01:00Z',
      image_urls: [],
      audio_text: null
    }

    render(<MessageItem message={aiMessage} />)

    expect(screen.getByText('重点内容').tagName).toBe('STRONG')
    expect(screen.queryByText('**重点内容**')).not.toBeInTheDocument()
  })

  it('渲染AI消息中的标题Markdown并去掉井号', () => {
    const aiMessage = {
      id: '2-2',
      role: 'assistant' as const,
      content: '### 1. 给自己放松的时间',
      created_at: '2024-01-01T12:01:00Z',
      image_urls: [],
      audio_text: null
    }

    render(<MessageItem message={aiMessage} />)

    expect(screen.getByText('1. 给自己放松的时间')).toBeInTheDocument()
    expect(screen.queryByText('### 1. 给自己放松的时间')).not.toBeInTheDocument()
  })

  it('渲染带图片的消息', () => {
    const messageWithImages = {
      id: '3',
      role: 'user' as const,
      content: '看看这张图片',
      created_at: '2024-01-01T12:02:00Z',
      image_urls: [
        'http://example.com/image1.jpg',
        'http://example.com/image2.jpg'
      ],
      audio_text: null
    }

    render(<MessageItem message={messageWithImages} />)

    // 检查图片
    const images = screen.getAllByAltText(/图片/)
    expect(images).toHaveLength(2)
  })

  it('不渲染音频转录标签', () => {
    const messageWithAudio = {
      id: '4',
      role: 'assistant' as const,
      content: '这是回复',
      created_at: '2024-01-01T12:03:00Z',
      image_urls: [],
      audio_text: '这是音频转录文本'
    }

    render(<MessageItem message={messageWithAudio} />)

    // 仅展示消息内容，不展示音频标签
    expect(screen.queryByText('音频转录:')).not.toBeInTheDocument()
    expect(screen.getByText('这是回复')).toBeInTheDocument()
  })
})
