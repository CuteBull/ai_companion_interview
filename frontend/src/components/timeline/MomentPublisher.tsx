import React, { useRef, useState } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { uploadFile } from '../../services/api'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { DEFAULT_AVATAR_URL } from '../../constants/avatarOptions'

interface MomentPublisherProps {
  publishing: boolean
  selectedAvatar: string
  onAvatarChange: (avatarUrl: string) => void | Promise<void>
  onPublish: (payload: {
    content: string
    image_urls: string[]
    location?: string
    author_avatar_url: string
  }) => Promise<void>
}

const MAX_IMAGES = 9

const MomentPublisher: React.FC<MomentPublisherProps> = ({
  publishing,
  selectedAvatar,
  onAvatarChange,
  onPublish,
}) => {
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const remainCount = MAX_IMAGES - imageUrls.length

  const handlePickImages = () => {
    fileInputRef.current?.click()
  }

  const handlePickAvatar = () => {
    avatarInputRef.current?.click()
  }

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0 || remainCount <= 0) return

    const toUpload = files.slice(0, remainCount)
    setUploading(true)
    try {
      const uploaded = await Promise.all(toUpload.map(async (file) => {
        const result = await uploadFile(file)
        return result.url as string
      }))
      setImageUrls((prev) => [...prev, ...uploaded])
    } catch (error) {
      console.error('Upload images failed:', error)
      alert('图片上传失败，请稍后再试')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setAvatarUploading(true)
    try {
      const result = await uploadFile(file)
      await onAvatarChange(result.url as string)
    } catch (error) {
      console.error('Upload avatar failed:', error)
      alert('头像上传失败，请稍后再试')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handlePublish = async () => {
    const trimmed = content.trim()
    if (!trimmed && imageUrls.length === 0) return

    await onPublish({
      content: trimmed,
      image_urls: imageUrls,
      location: location.trim() || undefined,
      author_avatar_url: selectedAvatar,
    })

    setContent('')
    setLocation('')
    setImageUrls([])
  }

  const disabled = publishing || uploading || (!content.trim() && imageUrls.length === 0)

  return (
    <div className="surface-card p-4 md:p-5">
      <div className="flex items-start gap-3">
        <img
          src={resolveMediaUrl(selectedAvatar)}
          alt="用户头像"
          className="h-11 w-11 rounded-md object-cover ring-1 ring-stone-200"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            placeholder="这一刻的想法..."
            className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-2.5 text-sm text-stone-800 focus:border-emerald-400 focus:bg-white focus:outline-none"
            disabled={publishing}
          />

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg">
                  <img
                    src={resolveMediaUrl(url)}
                    alt={`已选图片 ${index + 1}`}
                    className="h-20 w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/55 px-1 text-xs text-white"
                    onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== index))}
                    aria-label="移除图片"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600">头像</span>
            <button
              type="button"
              onClick={handlePickAvatar}
              disabled={publishing || avatarUploading}
              className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {avatarUploading ? '上传中...' : '从本地选择头像'}
            </button>
            <button
              type="button"
              onClick={() => onAvatarChange(DEFAULT_AVATAR_URL)}
              disabled={publishing || avatarUploading}
              className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              恢复默认
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelected}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePickImages}
                disabled={uploading || remainCount <= 0 || publishing}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PhotoIcon className="h-4 w-4" />
                {uploading ? '上传中...' : `图片 (${imageUrls.length}/${MAX_IMAGES})`}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
              />

              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="所在位置（可选）"
                maxLength={120}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-700 focus:border-emerald-400 focus:outline-none"
                disabled={publishing}
              />
            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={disabled}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? '发布中...' : '发表'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MomentPublisher
