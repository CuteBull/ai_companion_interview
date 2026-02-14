import React, { useState, useRef, useEffect } from 'react'
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline'
import { transcribeAudio } from '../../services/api'

interface AudioRecorderProps {
  onTranscribed: (text: string) => void
  disabled?: boolean
  isDarkMode?: boolean
  className?: string
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscribed,
  disabled,
  isDarkMode = false,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [supportedMimeType, setSupportedMimeType] = useState<string>('audio/webm')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // 检测浏览器支持的音频格式
  useEffect(() => {
    const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        setSupportedMimeType(mimeType)
        break
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processRecording(audioBlob)

        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Recording failed:', error)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processRecording = async (audioBlob: Blob) => {
    setIsTranscribing(true)

    try {
      // 根据MIME类型确定文件扩展名
      const getExtension = (mimeType: string) => {
        const extensions: Record<string, string> = {
          'audio/webm': 'webm',
          'audio/mp4': 'mp4',
          'audio/ogg': 'ogg',
          'audio/wav': 'wav',
        }
        return extensions[mimeType] || 'webm'
      }

      const extension = getExtension(supportedMimeType)
      const audioFile = new File([audioBlob], `recording.${extension}`, { type: supportedMimeType })

      // 转录音频
      const text = await transcribeAudio(audioFile)
      onTranscribed(text)

    } catch (error) {
      console.error('Transcription failed:', error)
      alert('音频转录失败，请重试')
    } finally {
      setIsTranscribing(false)
    }
  }

  if (isRecording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        disabled={disabled}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
          isDarkMode
            ? 'border-rose-500/60 bg-rose-500/15 text-rose-300 hover:bg-rose-500/20'
            : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
        } ${className}`}
        aria-label="停止录音"
      >
        <StopIcon className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled || isTranscribing}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
        isTranscribing
          ? isDarkMode
            ? 'cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-500'
            : 'cursor-not-allowed border-stone-300 bg-stone-100 text-stone-400'
          : isDarkMode
            ? 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-teal-500 hover:text-teal-300'
            : 'border-stone-300 bg-white/90 text-stone-600 hover:border-teal-500 hover:text-teal-700'
      } ${className}`}
      aria-label="语音输入"
    >
      {isTranscribing ? (
        <div className={`h-5 w-5 animate-spin rounded-full border-2 ${
          isDarkMode ? 'border-zinc-600 border-t-teal-300' : 'border-stone-300 border-t-teal-700'
        }`} />
      ) : (
        <MicrophoneIcon className="w-5 h-5" />
      )}
    </button>
  )
}

export default AudioRecorder
