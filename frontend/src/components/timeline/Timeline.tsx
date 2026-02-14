import React from 'react'
import MomentCard from './MomentCard'
import { Moment } from '../../services/momentService'

interface TimelineProps {
  moments: Moment[]
  onToggleLike: (momentId: string) => Promise<void>
  onCreateComment: (
    momentId: string,
    content: string,
    parentId?: string,
    replyToName?: string
  ) => Promise<void>
  onDeleteMoment: (momentId: string) => Promise<void>
  pendingLikeMomentId?: string | null
  pendingCommentMomentId?: string | null
  pendingDeleteMomentId?: string | null
}

const Timeline: React.FC<TimelineProps> = ({
  moments,
  onToggleLike,
  onCreateComment,
  onDeleteMoment,
  pendingLikeMomentId,
  pendingCommentMomentId,
  pendingDeleteMomentId,
}) => {
  if (moments.length === 0) {
    return (
      <div className="surface-card text-center py-12 text-stone-500">
        <div className="text-2xl text-stone-800">还没有朋友圈动态</div>
        <div className="mt-2 text-sm">发一条动态，记录你此刻的心情</div>
      </div>
    )
  }

  return (
    <div className="surface-card overflow-hidden">
      {moments.map((moment) => (
        <MomentCard
          key={moment.id}
          moment={moment}
          onToggleLike={onToggleLike}
          onCreateComment={onCreateComment}
          onDelete={onDeleteMoment}
          likeLoading={pendingLikeMomentId === moment.id}
          commentLoading={pendingCommentMomentId === moment.id}
          deleteLoading={pendingDeleteMomentId === moment.id}
        />
      ))}
    </div>
  )
}

export default Timeline
