import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat } from './chatService'

describe('chatService.streamChat', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('解析SSE并触发session与chunk回调', async () => {
    const encoder = new TextEncoder()
    const chunks = [
      encoder.encode('data: session:test-session\n\n'),
      encoder.encode('data: 你好\n\n'),
      encoder.encode('data: 世界\n\n'),
    ]
    let index = 0

    const reader = {
      read: vi.fn(async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined }
        }
        const value = chunks[index]
        index += 1
        return { done: false, value }
      }),
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => reader,
        },
      })
    )

    const onChunk = vi.fn()
    const onComplete = vi.fn()
    const onError = vi.fn()

    const result = await streamChat(
      {
        message: 'test',
      },
      onChunk,
      onComplete,
      onError
    )

    expect(result).toBe('你好世界')
    expect(onComplete).toHaveBeenCalledWith('test-session')
    expect(onChunk).toHaveBeenNthCalledWith(1, '你好')
    expect(onChunk).toHaveBeenNthCalledWith(2, '世界')
    expect(onError).not.toHaveBeenCalled()
  })

  it('HTTP失败时调用onError并抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
    )

    const onChunk = vi.fn()
    const onComplete = vi.fn()
    const onError = vi.fn()

    await expect(
      streamChat(
        {
          message: 'test',
        },
        onChunk,
        onComplete,
        onError
      )
    ).rejects.toThrow('HTTP error! status: 500')

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onChunk).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
