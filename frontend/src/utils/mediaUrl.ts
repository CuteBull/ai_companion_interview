const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url)

export const resolveMediaUrl = (rawUrl?: string | null): string => {
  if (!rawUrl) return ''
  const url = rawUrl.trim()
  if (!url) return ''

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  if (url.startsWith('//')) {
    return `https:${url}`
  }

  if (isAbsoluteUrl(url)) {
    if (/^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      return url.replace(/^http:\/\//i, 'https://')
    }
    return url
  }

  if (url.startsWith('/')) {
    // 前端静态资源（如 /avatar-*.svg）保持原路径；
    // 仅后端本地上传目录需要拼接API域名。
    if (url.startsWith('/uploads/') && API_BASE_URL) {
      return `${API_BASE_URL}${url}`
    }
    return url
  }

  if (!API_BASE_URL) {
    return url
  }

  return `${API_BASE_URL}/${url}`
}
