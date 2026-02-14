import React from 'react'
import MessageItem from './MessageItem'
import { Message } from '../../services/chatService'

interface MessageListProps {
  messages: Message[]
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="panel-muted mx-auto flex h-full max-w-xl flex-col items-center justify-center px-6 py-12 text-center text-stone-600">
        <div className="text-2xl text-stone-800">开始对话</div>
        <div className="mt-2 text-sm">发送消息或上传文件开始与AI陪伴助手对话</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}

export default MessageList
