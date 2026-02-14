export interface AvatarOption {
  id: string
  label: string
  url: string
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'default', label: '经典', url: '/user-avatar.svg' },
  { id: 'mint', label: '薄荷', url: '/avatar-mint.svg' },
  { id: 'rose', label: '玫瑰', url: '/avatar-rose.svg' },
  { id: 'sunset', label: '落日', url: '/avatar-sunset.svg' },
]

export const DEFAULT_AVATAR_URL = AVATAR_OPTIONS[0].url
export const TIMELINE_AVATAR_STORAGE_KEY = 'timeline_avatar_url'
