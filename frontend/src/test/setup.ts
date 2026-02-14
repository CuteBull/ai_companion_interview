import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// 全局测试配置
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// 模拟MediaRecorder API
class MockMediaRecorder {
  static isTypeSupported = () => true
  constructor() {}
  start = vi.fn()
  stop = vi.fn()
  pause = vi.fn()
  resume = vi.fn()
  ondataavailable = null
  onerror = null
  onstart = null
  onstop = null
  state = 'inactive'
  stream = null
  mimeType = 'audio/webm'
}

// @ts-ignore
global.MediaRecorder = MockMediaRecorder

// 模拟scrollIntoView
Element.prototype.scrollIntoView = vi.fn()
