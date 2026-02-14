import { describe, expect, it } from 'vitest'
import { encodeMomentCommentContent, parseMomentCommentContent } from './commentMedia'

describe('commentMedia', () => {
  it('encodes and parses text + image', () => {
    const encoded = encodeMomentCommentContent('你好', ['https://example.com/a.png'])
    const parsed = parseMomentCommentContent(encoded)

    expect(parsed.text).toBe('你好')
    expect(parsed.images).toEqual(['https://example.com/a.png'])
  })

  it('parses plain text as-is', () => {
    const parsed = parseMomentCommentContent('只有文字')
    expect(parsed.text).toBe('只有文字')
    expect(parsed.images).toEqual([])
  })

  it('supports image-only comment payload', () => {
    const encoded = encodeMomentCommentContent('', ['https://example.com/a.png'])
    const parsed = parseMomentCommentContent(encoded)

    expect(parsed.text).toBe('')
    expect(parsed.images).toEqual(['https://example.com/a.png'])
  })
})

