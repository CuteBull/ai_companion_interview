import React from 'react'
import MomentCard from './MomentCard'
import { Moment } from '../../services/momentService'

interface TimelineProps {
  moments: Moment[]
  currentUserAvatar: string
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
  onToggleLike,
  onRequestComment,
  onDeleteMoment,
  pendingLikeMomentId,
  activeCommentMomentId,
  pendingDeleteMomentId,
}) => {
  if (moments.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-12 text-center text-zinc-400">
        <div className="text-lg text-zinc-200">还没有朋友圈动态</div>
        <div className="mt-2 text-sm">发一条动态，记录你此刻的心情</div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
      {moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          currentUserAvatar={currentUserAvatar}
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
