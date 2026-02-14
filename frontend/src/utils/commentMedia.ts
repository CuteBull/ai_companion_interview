const COMMENT_MEDIA_MARKER = '\n[__MOMENT_COMMENT_MEDIA__]'

interface CommentMediaPayload {
  images: string[]
}

export interface ParsedMomentComment {
  text: string
  images: string[]
}

const normalizeImages = (images: string[]) =>
  images
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 1)

export const encodeMomentCommentContent = (text: string, images: string[]): string => {
  const normalizedText = text.trim()
  const normalizedImages = normalizeImages(images)
  if (normalizedImages.length === 0) return normalizedText

  const payload: CommentMediaPayload = { images: normalizedImages }
  const serialized = JSON.stringify(payload)
  return normalizedText
    ? `${normalizedText}${COMMENT_MEDIA_MARKER}${serialized}`
    : `${COMMENT_MEDIA_MARKER}${serialized}`
}

export const parseMomentCommentContent = (content: string): ParsedMomentComment => {
  const markerIndex = content.lastIndexOf(COMMENT_MEDIA_MARKER)
  if (markerIndex < 0) {
    return {
      text: content,
      images: [],
    }
  }

  const textPart = content.slice(0, markerIndex).trimEnd()
  const rawPayload = content.slice(markerIndex + COMMENT_MEDIA_MARKER.length).trim()
  if (!rawPayload) {
    return {
      text: content,
      images: [],
    }
  }

  try {
    const parsed = JSON.parse(rawPayload) as Partial<CommentMediaPayload>
    if (!Array.isArray(parsed.images)) {
      return {
        text: content,
        images: [],
      }
    }
    return {
      text: textPart,
      images: normalizeImages(parsed.images.filter((item): item is string => typeof item === 'string')),
    }
  } catch {
    return {
      text: content,
      images: [],
    }
  }
}

