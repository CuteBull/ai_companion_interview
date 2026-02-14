import React from 'react'
import { Link } from 'react-router-dom'
import { Session } from '../../services/chatService'
import { ChatBubbleLeftRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface ConversationCardProps {
  session: Session
  index?: number
}

const ConversationCard: React.FC<ConversationCardProps> = ({ session, index = 0 }) => {
  const date = new Date(session.created_at)
  const formattedDate = format(date, 'yyyy-MM-dd HH:mm')

  return (
    <div
      className="surface-card fade-rise overflow-hidden"
      style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
    >
      <div className="p-5 md:p-6">
        {/* 卡片头部 */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 p-2.5 text-white shadow-md shadow-teal-700/25">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-stone-900">{session.title}</h3>
              <div className="mt-1 flex items-center text-sm text-stone-500">
                <CalendarDaysIcon className="w-4 h-4 mr-1" />
                {formattedDate}
              </div>
            </div>
          </div>

          <div className="rounded-full border border-stone-300 bg-stone-100/80 px-3 py-1 text-xs text-stone-600">
            {session.message_count} 条消息
          </div>
        </div>

        {/* 预览图 */}
        {session.preview_image && (
          <div className="mb-4">
            <img
              src={session.preview_image}
              alt="预览"
              className="h-48 w-full rounded-2xl object-cover ring-1 ring-black/5"
            />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <Link
            to={`/chat?sessionId=${session.id}`}
            className="btn-primary"
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
            继续对话
          </Link>

          <Link
            to={`/timeline/${session.id}`}
            className="btn-secondary"
          >
            查看详情
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ConversationCard
