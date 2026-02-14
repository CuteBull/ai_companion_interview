import React, { useState } from 'react'
import ChatInterface from '../components/chat/ChatInterface'
import { useLocation } from 'react-router-dom'

const ChatPage: React.FC = () => {
  const location = useLocation()
  const [sessionId, setSessionId] = useState<string>()

  // 从URL参数获取sessionId
  React.useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sid = params.get('sessionId')
    if (sid) {
      setSessionId(sid)
    }
  }, [location])

  return (
    <div className="mx-auto max-w-5xl">
      <ChatInterface sessionId={sessionId} />
    </div>
  )
}

export default ChatPage
