import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)

    // 检查应用标题或主要元素 - 可能有多个元素包含相同文本
    const elements = screen.getAllByText(/AI陪伴对话/i)
    expect(elements.length).toBeGreaterThan(0)
    // 检查至少一个元素在导航栏中
    const navElement = screen.getByRole('navigation').querySelector('h1')
    expect(navElement).toHaveTextContent(/AI陪伴对话/i)
  })

  it('contains navigation links', () => {
    render(<App />)

    // 检查导航链接 - 使用更具体的查询
    const navLinks = screen.getAllByRole('link')
    const chatLink = navLinks.find(link => link.textContent?.includes('对话'))
    const timelineLink = navLinks.find(link => link.textContent?.includes('朋友圈'))

    expect(chatLink).toBeInTheDocument()
    expect(timelineLink).toBeInTheDocument()
  })
})
