import React, { useEffect, useRef, useState } from 'react'
import FileUpload from './FileUpload'
import AudioRecorder from './AudioRecorder'
import { PaperAirplaneIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'

interface InputAreaProps {
  onSend: (message: string, imageUrls?: string[]) => void
  isLoading: boolean
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'
  const [message, setMessage] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const fileUploadRef = useRef<{ open: () => void }>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldRefocusRef = useRef(false)

  const focusInput = () => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      textarea.focus()
      const length = textarea.value.length
      textarea.setSelectionRange(length, length)
    })
  }

  useEffect(() => {
    if (!isLoading && shouldRefocusRef.current) {
      shouldRefocusRef.current = false
      focusInput()
    }
  }, [isLoading])

  const submitMessage = (audioTranscription?: string) => {
    const trimmedMessage = message.trim()
    const trimmedAudio = audioTranscription?.trim()
    if (!trimmedMessage && imageUrls.length === 0 && !trimmedAudio) return

    const textParts = [trimmedMessage, trimmedAudio].filter(Boolean) as string[]
    onSend(textParts.join('\n'), imageUrls)
    setMessage('')
    setImageUrls([])

    shouldRefocusRef.current = true
    if (!isLoading) {
      focusInput()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        submitMessage()
      }
    }
  }

  const handleImageUpload = (urls: string[]) => {
    setImageUrls(prev => [...prev, ...urls])
  }

  const handleAudioTranscribed = (text: string) => {
    if (!isLoading) {
      submitMessage(text)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      {/* 图片预览 */}
      {imageUrls.length > 0 && (
        <div className={`flex space-x-2 overflow-x-auto rounded-xl border p-2 ${
          isDarkMode
            ? 'border-teal-900/60 bg-teal-900/20'
            : 'border-teal-100/70 bg-teal-50/50'
        }`}>
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`预览 ${index + 1}`}
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/90"
              />
              <button
                type="button"
                onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white shadow-sm shadow-rose-700/30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className={`flex items-end gap-2 rounded-xl border p-2 ${
        isDarkMode
          ? 'border-zinc-700 bg-zinc-900/85'
          : 'border-stone-300 bg-white/90'
      }`}>
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className={`w-full resize-none rounded-xl border px-4 py-2 shadow-sm focus:outline-none ${
              isDarkMode
                ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                : 'border-stone-300 bg-white text-stone-800 placeholder:text-stone-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-400/40'
            }`}
            rows={1}
            style={{ minHeight: 44, maxHeight: 108 }}
            disabled={isLoading}
          />
        </div>

        {/* 操作按钮 */}
        <div className={`flex shrink-0 items-center gap-1 rounded-xl border px-1 py-1 ${
          isDarkMode
            ? 'border-zinc-700 bg-zinc-900/70'
            : 'border-stone-200 bg-stone-50/70'
        }`}>
          <button
            type="button"
            onClick={() => fileUploadRef.current?.open()}
            disabled={isLoading}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
              isDarkMode
                ? 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-teal-600 hover:text-teal-300'
                : 'border-stone-300 bg-white text-stone-600 hover:border-teal-500 hover:text-teal-700'
            }`}
            aria-label="上传图片"
          >
            <PhotoIcon className="h-5 w-5" />
          </button>

          <AudioRecorder
            onTranscribed={handleAudioTranscribed}
            disabled={isLoading}
            isDarkMode={isDarkMode}
          />

          <div className={`h-5 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-stone-300'}`} />
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            disabled={isLoading || (!message.trim() && imageUrls.length === 0)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shadow-md shadow-teal-700/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送消息"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <FileUpload ref={fileUploadRef} onUpload={handleImageUpload} />
    </form>
  )
}

export default InputArea
