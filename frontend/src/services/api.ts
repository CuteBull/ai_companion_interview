import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
}

if (API_KEY) {
  defaultHeaders['X-API-Key'] = API_KEY
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: defaultHeaders,
})

// 文件上传API
export const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
  })

  return response.data
}

// 音频转录API（通过后端代理）
export const transcribeAudio = async (audioFile: File): Promise<string> => {
  const formData = new FormData()
  formData.append('audio', audioFile)

  const response = await api.post('/api/upload/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
  })

  return response.data.text
}

export default api
