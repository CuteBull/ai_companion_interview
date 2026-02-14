import React, { useMemo } from 'react'
import { Message } from '../../services/chatService'
import { UserIcon } from '@heroicons/react/24/outline'
import { resolveMediaUrl } from '../../utils/mediaUrl'

interface MessageItemProps {
  message: Message
}

const renderInlineMarkdown = (content: string) => {
  const nodes: React.ReactNode[] = []
  const boldPattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = boldPattern.exec(content)) !== null) {
    const plainText = content.slice(lastIndex, match.index)
    if (plainText) {
      nodes.push(<React.Fragment key={`text-${key++}`}>{plainText}</React.Fragment>)
    }
    nodes.push(<strong key={`bold-${key++}`}>{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  const trailingText = content.slice(lastIndex)
  if (trailingText) {
    nodes.push(<React.Fragment key={`text-${key++}`}>{trailingText}</React.Fragment>)
  }

  return nodes.length > 0 ? nodes : content
}

const renderAssistantMarkdown = (content: string) => {
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'ol' | 'ul' | null = null

  const flushList = (keySuffix: number) => {
    if (listItems.length === 0 || !listType) return

    if (listType === 'ol') {
      blocks.push(
        <ol key={`ol-${keySuffix}`} className="list-decimal pl-5 space-y-1">
          {listItems}
        </ol>
      )
    } else {
      blocks.push(
        <ul key={`ul-${keySuffix}`} className="list-disc pl-5 space-y-1">
          {listItems}
        </ul>
      )
    }

    listItems = []
    listType = null
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      flushList(idx)
      return
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushList(idx)
      const level = headingMatch[1].length
      const headingClass = level === 1
        ? 'text-lg font-semibold'
        : level === 2
          ? 'text-base font-semibold'
          : 'text-sm font-semibold'
      blocks.push(
        <p key={`heading-${idx}`} className={headingClass}>
          {renderInlineMarkdown(headingMatch[2])}
        </p>
      )
      return
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      if (listType && listType !== 'ol') {
        flushList(idx)
      }
      listType = 'ol'
      listItems.push(
        <li key={`ol-item-${idx}`}>
          {renderInlineMarkdown(orderedMatch[1])}
        </li>
      )
      return
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedMatch) {
      if (listType && listType !== 'ul') {
        flushList(idx)
      }
      listType = 'ul'
      listItems.push(
        <li key={`ul-item-${idx}`}>
          {renderInlineMarkdown(unorderedMatch[1])}
        </li>
      )
      return
    }

    flushList(idx)
    blocks.push(
      <p key={`p-${idx}`}>
        {renderInlineMarkdown(line)}
      </p>
    )
  })

  flushList(lines.length)
  return blocks.length > 0 ? blocks : content
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const formattedTime = useMemo(
    () => new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [message.created_at]
  )
  const renderedAssistantContent = useMemo(
    () => (isUser ? null : renderAssistantMarkdown(message.content)),
    [isUser, message.content]
  )

  return (
    <div className={`fade-rise flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 shadow-sm md:max-w-[78%] ${
          isUser
            ? 'rounded-br-md border-teal-500/60 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-teal-700/20'
            : 'rounded-bl-md border-stone-200 bg-white/95 text-stone-800 shadow-stone-300/35'
        }`}
      >
        {/* 消息头部 */}
        <div className="mb-1 flex items-center">
          <div className={`mr-1.5 rounded-full p-1 ${
            isUser ? 'bg-white/20' : 'bg-stone-200'
          }`}>
            {isUser ? (
              <UserIcon className="h-3.5 w-3.5" />
            ) : (
              <img
                src="/assistant-avatar.svg"
                alt="AI陪伴助手头像"
                className="h-3.5 w-3.5 rounded-full object-cover"
              />
            )}
          </div>
          <span className="text-[13px] font-medium tracking-wide">
            {isUser ? '你' : 'AI陪伴助手'}
          </span>
          <span className="ml-1.5 text-[11px] opacity-75">
            {formattedTime}
          </span>
        </div>

        {/* 消息内容 */}
        {isUser ? (
          <div className="whitespace-pre-wrap leading-[1.45]">
            {message.content}
          </div>
        ) : (
          <div className="space-y-1 leading-[1.45]">
            {renderedAssistantContent}
          </div>
        )}

        {/* 图片预览 */}
        {message.image_urls && message.image_urls.length > 0 && (
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {message.image_urls.map((url, index) => (
              <img
                key={index}
                src={resolveMediaUrl(url)}
                alt={`图片 ${index + 1}`}
                className="h-28 w-full rounded-lg object-cover ring-1 ring-black/5"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default React.memo(MessageItem)
