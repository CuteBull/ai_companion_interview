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
      <div className={`fade-rise rounded-3xl border px-4 py-14 text-center shadow-xl ${
        isDarkMode
          ? 'border-zinc-800 bg-zinc-900/72 text-zinc-400 shadow-black/30'
          : 'border-white/70 bg-white/84 text-stone-500 shadow-stone-400/20 backdrop-blur-md'
      }`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/30 to-cyan-500/20 text-2xl">🌿</div>
        <div className={`text-xl ${isDarkMode ? 'text-zinc-200' : 'text-stone-800'}`}>还没有朋友圈动态</div>
        <div className={`mt-2 text-sm ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>发一条动态，记录你此刻的心情</div>
      </div>
    )
  }

  return (
    <div className={`fade-rise overflow-hidden rounded-3xl border shadow-xl ${
      isDarkMode
        ? 'border-zinc-800 bg-zinc-950/70 shadow-black/35'
        : 'border-white/70 bg-white/86 shadow-stone-400/20 backdrop-blur-md'
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
