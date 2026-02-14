from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models.moment import Moment, MomentLike, MomentComment
from app.schemas.moment import (
    MomentCommentCreateRequest,
    MomentCommentResponse,
    MomentCreateRequest,
    MomentDeleteResponse,
    MomentLikeToggleRequest,
    MomentLikeToggleResponse,
    MomentResponse,
    MomentsListResponse,
)

router = APIRouter()


def _normalize_username(name: str | None, default: str = "你") -> str:
    normalized = (name or default).strip()
    return normalized or default


def _serialize_comment(comment: MomentComment) -> MomentCommentResponse:
    return MomentCommentResponse(
        id=comment.id,
        moment_id=comment.moment_id,
        parent_id=comment.parent_id,
        user_name=comment.user_name,
        reply_to_name=comment.reply_to_name,
        content=comment.content,
        created_at=comment.created_at.isoformat(),
    )


def _serialize_moment(moment: Moment, me: str = "你") -> MomentResponse:
    likes = [like.user_name for like in sorted(moment.likes, key=lambda x: x.created_at)]
    comments = sorted(moment.comments, key=lambda x: x.created_at)

    return MomentResponse(
        id=moment.id,
        author_name=moment.author_name,
        author_avatar_url=moment.author_avatar_url,
        content=moment.content,
        image_urls=moment.image_urls or [],
        location=moment.location,
        session_id=moment.session_id,
        created_at=moment.created_at.isoformat(),
        like_count=len(likes),
        comment_count=len(comments),
        likes=likes,
        liked_by_me=me in likes,
        comments=[_serialize_comment(comment) for comment in comments],
    )


@router.get("", response_model=MomentsListResponse)
def get_moments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    me: str = Query("你"),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit
    me_name = _normalize_username(me)

    total = db.query(Moment).count()
    rows = (
        db.query(Moment)
        .options(
            selectinload(Moment.likes),
            selectinload(Moment.comments),
        )
        .order_by(Moment.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return MomentsListResponse(
        moments=[_serialize_moment(moment, me=me_name) for moment in rows],
        total=total,
        page=page,
        limit=limit,
        has_more=offset + len(rows) < total,
    )


@router.post("", response_model=MomentResponse)
def create_moment(payload: MomentCreateRequest, db: Session = Depends(get_db)):
    content = payload.content.strip()
    image_urls = [url for url in (payload.image_urls or []) if url]

    if not content and not image_urls:
        raise HTTPException(status_code=400, detail="内容和图片不能同时为空")

    moment = Moment(
        author_name=_normalize_username(payload.author_name),
        author_avatar_url=(payload.author_avatar_url or "").strip() or None,
        content=content,
        image_urls=image_urls,
        location=(payload.location or "").strip() or None,
        session_id=payload.session_id,
    )

    db.add(moment)
    db.commit()
    db.refresh(moment)

    # 保证序列化时关系可用
    moment.likes = []
    moment.comments = []
    return _serialize_moment(moment)


@router.post("/{moment_id}/likes/toggle", response_model=MomentLikeToggleResponse)
def toggle_like(
    moment_id: str,
    payload: MomentLikeToggleRequest,
    db: Session = Depends(get_db),
):
    me = _normalize_username(payload.user_name)

    moment = (
        db.query(Moment)
        .options(selectinload(Moment.likes))
        .filter(Moment.id == moment_id)
        .first()
    )
    if not moment:
        raise HTTPException(status_code=404, detail="动态不存在")

    existing = (
        db.query(MomentLike)
        .filter(MomentLike.moment_id == moment_id, MomentLike.user_name == me)
        .first()
    )

    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(MomentLike(moment_id=moment_id, user_name=me))
        liked = True

    db.commit()

    likes = (
        db.query(MomentLike)
        .filter(MomentLike.moment_id == moment_id)
        .order_by(MomentLike.created_at.asc())
        .all()
    )
    like_names = [item.user_name for item in likes]

    return MomentLikeToggleResponse(
        moment_id=moment_id,
        liked=liked,
        like_count=len(like_names),
        likes=like_names,
    )


@router.post("/{moment_id}/comments", response_model=MomentCommentResponse)
def add_comment(
    moment_id: str,
    payload: MomentCommentCreateRequest,
    db: Session = Depends(get_db),
):
    moment = db.query(Moment).filter(Moment.id == moment_id).first()
    if not moment:
        raise HTTPException(status_code=404, detail="动态不存在")

    parent_id = payload.parent_id
    reply_to_name = (payload.reply_to_name or "").strip() or None
    if parent_id:
        parent_comment = (
            db.query(MomentComment)
            .filter(
                MomentComment.id == parent_id,
                MomentComment.moment_id == moment_id,
            )
            .first()
        )
        if not parent_comment:
            raise HTTPException(status_code=404, detail="回复目标不存在")
        if not reply_to_name:
            reply_to_name = parent_comment.user_name

    comment = MomentComment(
        moment_id=moment_id,
        parent_id=parent_id,
        user_name=_normalize_username(payload.user_name),
        reply_to_name=reply_to_name,
        content=payload.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _serialize_comment(comment)


@router.delete("/{moment_id}", response_model=MomentDeleteResponse)
def delete_moment(
    moment_id: str,
    user_name: str = Query("你"),
    db: Session = Depends(get_db),
):
    me = _normalize_username(user_name)

    moment = db.query(Moment).filter(Moment.id == moment_id).first()
    if not moment:
        raise HTTPException(status_code=404, detail="动态不存在")

    if moment.author_name != me:
        raise HTTPException(status_code=403, detail="只能删除自己发布的动态")

    db.delete(moment)
    db.commit()
    return MomentDeleteResponse(moment_id=moment_id, deleted=True)
