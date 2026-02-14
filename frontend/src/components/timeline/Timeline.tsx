import React from 'react'
import ConversationCard from './ConversationCard'
import { Session } from '../../services/chatService'

interface TimelineProps {
  sessions: Session[]
}

const Timeline: React.FC<TimelineProps> = ({ sessions }) => {
  if (sessions.length === 0) {
    return (
      <div className="surface-card text-center py-12 text-stone-500">
        <div className="text-2xl text-stone-800">暂无对话</div>
        <div className="mt-2 text-sm">去对话页面开始新的对话</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5">
      {sessions.map((session, index) => (
        <ConversationCard key={session.id} session={session} index={index} />
      ))}
    </div>
  )
}

export default Timeline
