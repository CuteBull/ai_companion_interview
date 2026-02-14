import React, { useState, useRef } from 'react'
import FileUpload from './FileUpload'
import AudioRecorder from './AudioRecorder'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface InputAreaProps {
  onSend: (message: string, imageUrls?: string[]) => void
  isLoading: boolean
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [audioText, setAudioText] = useState<string>()
  const fileUploadRef = useRef<{ open: () => void }>(null)

  const submitMessage = () => {
    if (!message.trim() && imageUrls.length === 0 && !audioText) return

    const textParts = [message.trim(), audioText?.trim()].filter(Boolean) as string[]
    onSend(textParts.join('\n'), imageUrls)
    setMessage('')
    setImageUrls([])
    setAudioText(undefined)
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
    setAudioText(text)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 图片预览 */}
      {imageUrls.length > 0 && (
        <div className="flex space-x-2 overflow-x-auto rounded-2xl border border-teal-100/70 bg-teal-50/50 p-3">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`预览 ${index + 1}`}
                className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/90"
              />
              <button
                type="button"
                onClick={() => setImageUrls(prev => prev.filter((_, i) => i !== index))}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs text-white shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 音频文本预览 */}
      {audioText && (
        <div className="panel-muted p-3">
          <div className="text-sm text-teal-800">
            <span className="font-medium">音频转录:</span> {audioText}
          </div>
          <button
            type="button"
            onClick={() => setAudioText(undefined)}
            className="mt-1 text-xs text-teal-600 hover:text-teal-700"
          >
            移除
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end space-x-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="w-full resize-none rounded-2xl border border-stone-300 bg-white/90 px-4 py-2.5 text-stone-800 shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-400/40"
            rows={2}
            disabled={isLoading}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col space-y-1.5">
          <button
            type="button"
            onClick={() => fileUploadRef.current?.open()}
            disabled={isLoading}
            className="rounded-xl border border-stone-300 bg-white/90 p-2 text-stone-600 transition hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
            aria-label="上传图片"
          >
            📷
          </button>

          <AudioRecorder
            onTranscribed={handleAudioTranscribed}
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || (!message.trim() && imageUrls.length === 0 && !audioText)}
            className="rounded-xl bg-teal-700 p-2 text-white shadow-md shadow-teal-700/20 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
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
