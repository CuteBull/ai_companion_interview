import api from './api'

export interface MomentComment {
  id: string
  moment_id: string
  parent_id?: string | null
  user_name: string
  reply_to_name?: string | null
  content: string
  created_at: string
}

export interface Moment {
  id: string
  author_name: string
  author_avatar_url?: string | null
  content: string
  image_urls: string[]
  location?: string | null
  session_id?: string | null
  created_at: string
  like_count: number
  comment_count: number
  likes: string[]
  liked_by_me: boolean
  comments: MomentComment[]
}

export interface MomentsResponse {
  moments: Moment[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export const getMoments = async (page: number = 1, limit: number = 20): Promise<MomentsResponse> => {
  const response = await api.get('/api/moments', { params: { page, limit, me: '你' } })
  return response.data
}

export const createMoment = async (payload: {
  content: string
  image_urls?: string[]
  location?: string
  author_name?: string
  author_avatar_url?: string
  session_id?: string
}): Promise<Moment> => {
  const response = await api.post('/api/moments', payload)
  return response.data
}

export const toggleMomentLike = async (
  momentId: string,
  userName: string = '你'
): Promise<{ moment_id: string; liked: boolean; like_count: number; likes: string[] }> => {
  const response = await api.post(`/api/moments/${momentId}/likes/toggle`, {
    user_name: userName,
  })
  return response.data
}

export const addMomentComment = async (
  momentId: string,
  payload: {
    content: string
    parent_id?: string
    reply_to_name?: string
    user_name?: string
  }
): Promise<MomentComment> => {
  const response = await api.post(`/api/moments/${momentId}/comments`, payload)
  return response.data
}

export const deleteMoment = async (
  momentId: string,
  userName: string = '你'
): Promise<{ moment_id: string; deleted: boolean }> => {
  const response = await api.delete(`/api/moments/${momentId}`, {
    params: { user_name: userName },
  })
  return response.data
}

export const updateMomentAvatarForUser = async (
  authorAvatarUrl: string,
  userName: string = '你'
): Promise<{ user_name: string; author_avatar_url: string; updated_count: number }> => {
  const response = await api.patch('/api/moments/avatar', {
    user_name: userName,
    author_avatar_url: authorAvatarUrl,
  })
  return response.data
}
