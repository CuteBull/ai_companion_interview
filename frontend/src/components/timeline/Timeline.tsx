import React from 'react'
import MomentCard from './MomentCard'
import { Moment } from '../../services/momentService'

interface TimelineProps {
  moments: Moment[]
  currentUserAvatar: string
  isDarkMode: boolean
  onToggleLike: (momentId: string) => Promise<void>
  onRequestComment: (momentId: string, parentId?: string, replyToName?: string) => void
  onDeleteMoment: (momentId: string) => Promise<void>
  pendingLikeMomentId?: string | null
  activeCommentMomentId?: string | null
  pendingDeleteMomentId?: string | null
}

const Timeline: React.FC<TimelineProps> = ({
  moments,
  currentUserAvatar,
  isDarkMode,
  onToggleLike,
  onRequestComment,
  onDeleteMoment,
  pendingLikeMomentId,
  activeCommentMomentId,
  pendingDeleteMomentId,
}) => {
  if (moments.length === 0) {
    return (
      <div className={`rounded-2xl border px-4 py-14 text-center shadow-sm ${
        isDarkMode
          ? 'border-zinc-800 bg-zinc-900/70 text-zinc-400'
          : 'border-stone-200 bg-white/85 text-stone-500 shadow-stone-300/30 backdrop-blur-sm'
      }`}>
        <div className={`text-lg ${isDarkMode ? 'text-zinc-200' : 'text-stone-800'}`}>还没有朋友圈动态</div>
        <div className="mt-2 text-sm">发一条动态，记录你此刻的心情</div>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${
      isDarkMode
        ? 'border-zinc-800 bg-zinc-950/65'
        : 'border-stone-200 bg-white/88 shadow-xl shadow-stone-300/25 backdrop-blur-sm'
    }`}>
      {moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          currentUserAvatar={currentUserAvatar}
          isDarkMode={isDarkMode}
          onToggleLike={onToggleLike}
          onRequestComment={onRequestComment}
          onDelete={onDeleteMoment}
          likeLoading={pendingLikeMomentId === moment.id}
          deleteLoading={pendingDeleteMomentId === moment.id}
          commentActive={activeCommentMomentId === moment.id}
        />
      ))}
    </div>
  )
}

export default Timeline
