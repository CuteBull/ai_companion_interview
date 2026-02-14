import React from 'react'
import {
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  PhotoIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import MessageItem from './MessageItem'
import { Message } from '../../services/chatService'
import { useTheme } from '../../contexts/ThemeContext'

interface MessageListProps {
  messages: Message[]
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-center px-4 py-8">
        <div className={`panel-muted relative w-full max-w-2xl overflow-hidden rounded-3xl border px-8 py-10 text-center ${
          isDarkMode ? 'text-zinc-200' : 'text-stone-700'
        }`}>
          <div className={`pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full blur-2xl ${
            isDarkMode ? 'bg-teal-500/20' : 'bg-teal-200/70'
          }`} />
          <div className={`pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-sky-500/20' : 'bg-orange-200/70'
          }`} />

          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isDarkMode
              ? 'border-teal-400/40 bg-teal-500/15 text-teal-200'
              : 'border-teal-200 bg-white/90 text-teal-700'
          }`}>
            <SparklesIcon className="h-7 w-7" />
          </div>

          <div className={`text-3xl font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`}>
            把心事轻轻放在这里
          </div>
          <div className={`mt-2 text-sm leading-relaxed ${
            isDarkMode ? 'text-zinc-300' : 'text-stone-600'
          }`}>
            写下一句近况，或发一张照片、语音，我会温柔接住你的每一次表达。
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
              isDarkMode ? 'bg-zinc-800/90 text-zinc-200' : 'bg-white/85 text-stone-700'
            }`}>
              <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
              倾诉心情
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
              isDarkMode ? 'bg-zinc-800/90 text-zinc-200' : 'bg-white/85 text-stone-700'
            }`}>
              <PhotoIcon className="h-3.5 w-3.5" />
              分享图片
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
              isDarkMode ? 'bg-zinc-800/90 text-zinc-200' : 'bg-white/85 text-stone-700'
            }`}>
              <MicrophoneIcon className="h-3.5 w-3.5" />
              语音表达
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}

export default React.memo(MessageList)
