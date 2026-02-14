import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ConversationCard from './ConversationCard'

describe('ConversationCard', () => {
  it('查看详情和继续对话按钮都可点击跳转', () => {
    const session = {
      id: 'session-123',
      title: '测试会话',
      created_at: '2026-02-14T10:00:00.000Z',
      message_count: 5,
      preview_image: undefined,
    }

    render(
      <MemoryRouter>
        <ConversationCard session={session} />
      </MemoryRouter>
    )

    const continueLink = screen.getByRole('link', { name: /继续对话/i })
    const detailLink = screen.getByRole('link', { name: /查看详情/i })

    expect(continueLink).toHaveAttribute('href', '/chat?sessionId=session-123')
    expect(detailLink).toHaveAttribute('href', '/timeline/session-123')
  })
})
