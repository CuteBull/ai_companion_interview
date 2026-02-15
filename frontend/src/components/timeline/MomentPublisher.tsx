import React, { useRef, useState } from 'react'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { uploadFile } from '../../services/api'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { DEFAULT_AVATAR_URL } from '../../constants/avatarOptions'
import { extractErrorMessage } from '../../utils/errorMessage'

interface MomentPublisherProps {
  publishing: boolean
  selectedAvatar: string
  isDarkMode: boolean
  onAvatarChange: (avatarUrl: string) => void | Promise<void>
  onPublish: (payload: {
    content: string
    image_urls: string[]
    location?: string
    author_avatar_url: string
  }) => Promise<void>
}

const MAX_IMAGES = 9
type CityOption = {
  name: string
  pinyin: string
}

const CITY_OPTIONS: CityOption[] = [
  { name: '澳门', pinyin: 'aomen' },
  { name: '北京', pinyin: 'beijing' },
  { name: '长春', pinyin: 'changchun' },
  { name: '长沙', pinyin: 'changsha' },
  { name: '成都', pinyin: 'chengdu' },
  { name: '重庆', pinyin: 'chongqing' },
  { name: '大连', pinyin: 'dalian' },
  { name: '福州', pinyin: 'fuzhou' },
  { name: '贵阳', pinyin: 'guiyang' },
  { name: '广州', pinyin: 'guangzhou' },
  { name: '哈尔滨', pinyin: 'haerbin' },
  { name: '海口', pinyin: 'haikou' },
  { name: '杭州', pinyin: 'hangzhou' },
  { name: '合肥', pinyin: 'hefei' },
  { name: '呼和浩特', pinyin: 'huhehaote' },
  { name: '济南', pinyin: 'jinan' },
  { name: '昆明', pinyin: 'kunming' },
  { name: '兰州', pinyin: 'lanzhou' },
  { name: '南昌', pinyin: 'nanchang' },
  { name: '南京', pinyin: 'nanjing' },
  { name: '南宁', pinyin: 'nanning' },
  { name: '宁波', pinyin: 'ningbo' },
  { name: '青岛', pinyin: 'qingdao' },
  { name: '三亚', pinyin: 'sanya' },
  { name: '上海', pinyin: 'shanghai' },
  { name: '深圳', pinyin: 'shenzhen' },
  { name: '沈阳', pinyin: 'shenyang' },
  { name: '石家庄', pinyin: 'shijiazhuang' },
  { name: '苏州', pinyin: 'suzhou' },
  { name: '台北', pinyin: 'taibei' },
  { name: '太原', pinyin: 'taiyuan' },
  { name: '天津', pinyin: 'tianjin' },
  { name: '乌鲁木齐', pinyin: 'wulumuqi' },
  { name: '武汉', pinyin: 'wuhan' },
  { name: '西安', pinyin: 'xian' },
  { name: '香港', pinyin: 'xianggang' },
  { name: '厦门', pinyin: 'xiamen' },
  { name: '郑州', pinyin: 'zhengzhou' },
]

const CITY_OPTIONS_BY_INITIAL = CITY_OPTIONS.reduce<Record<string, CityOption[]>>((groups, option) => {
  const initial = option.pinyin.charAt(0).toUpperCase()
  if (!groups[initial]) groups[initial] = []
  groups[initial].push(option)
  return groups
}, {})

Object.values(CITY_OPTIONS_BY_INITIAL).forEach((group) => {
  group.sort((a, b) => a.pinyin.localeCompare(b.pinyin))
})

const SORTED_CITY_INITIALS = Object.keys(CITY_OPTIONS_BY_INITIAL).sort()

const MomentPublisher: React.FC<MomentPublisherProps> = ({
  publishing,
  selectedAvatar,
  isDarkMode,
  onAvatarChange,
  onPublish,
}) => {
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showedLocalStorageNotice, setShowedLocalStorageNotice] = useState(false)
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
      let localStorageUsed = false
      const uploaded = await Promise.all(toUpload.map(async (file) => {
        const result = await uploadFile(file)
        if (result.storage === 'local') localStorageUsed = true
        return result.url as string
      }))
      if (localStorageUsed && !showedLocalStorageNotice) {
        setShowedLocalStorageNotice(true)
        alert('当前图片使用临时本地存储，服务重启或重新部署后可能失效。请检查后端 Cloudinary 配置。')
      }
      setImageUrls((prev) => [...prev, ...uploaded])
    } catch (error) {
      console.error('Upload images failed:', error)
      alert(`图片上传失败：${extractErrorMessage(error, '请稍后再试')}`)
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
      if (result.storage === 'local' && !showedLocalStorageNotice) {
        setShowedLocalStorageNotice(true)
        alert('当前头像使用临时本地存储，服务重启或重新部署后可能失效。请检查后端 Cloudinary 配置。')
      }
      await onAvatarChange(result.url as string)
    } catch (error) {
      console.error('Upload avatar failed:', error)
      alert(`头像上传失败：${extractErrorMessage(error, '请稍后再试')}`)
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
    <div className={`rounded-2xl border p-4 shadow-xl ${
      isDarkMode
        ? 'border-zinc-800 bg-zinc-900/75 shadow-black/25'
        : 'border-stone-200 bg-white/88 shadow-stone-300/25 backdrop-blur-sm'
    }`}>
      <div className="flex items-start gap-3">
        <img
          src={resolveMediaUrl(selectedAvatar)}
          alt="用户头像"
          className={`h-11 w-11 rounded-xl object-cover ring-1 ${
            isDarkMode ? 'ring-zinc-700/80' : 'ring-stone-200'
          }`}
          loading="lazy"
          decoding="async"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            placeholder="这一刻的想法..."
            className={`w-full resize-none rounded-xl border px-3 py-2.5 text-base focus:outline-none ${
              isDarkMode
                ? 'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500'
                : 'border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:border-teal-500'
            }`}
            disabled={publishing}
          />

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg">
                  <img
                    src={resolveMediaUrl(url)}
                    alt={`已选图片 ${index + 1}`}
                    className={`h-24 w-full object-cover ring-1 ${
                      isDarkMode ? 'ring-zinc-700/80' : 'ring-stone-200'
                    }`}
                    loading="lazy"
                    decoding="async"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 text-xs text-white"
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
            <span className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>头像</span>
            <button
              type="button"
              onClick={handlePickAvatar}
              disabled={publishing || avatarUploading}
              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {avatarUploading ? '上传中...' : '从本地选择头像'}
            </button>
            <button
              type="button"
              onClick={() => onAvatarChange(DEFAULT_AVATAR_URL)}
              disabled={publishing || avatarUploading}
              className={`inline-flex items-center rounded-lg border px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
              }`}
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
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDarkMode
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                }`}
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

              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={`w-[240px] rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none sm:w-[300px] md:w-[340px] ${
                  isDarkMode
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200 focus:border-zinc-500'
                    : 'border-stone-300 bg-white text-stone-700 focus:border-teal-500'
                }`}
                disabled={publishing}
                aria-label="选择所在位置"
              >
                <option value="">所在位置（可选）</option>
                {SORTED_CITY_INITIALS.map((initial) => (
                  <optgroup key={initial} label={initial}>
                    {CITY_OPTIONS_BY_INITIAL[initial].map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={disabled}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-zinc-100 text-zinc-900 hover:bg-white'
                  : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}
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
