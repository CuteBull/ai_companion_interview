"""add moments tables

Revision ID: 6f2f67dcbf36
Revises: 2d208ec50193
Create Date: 2026-02-14 22:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f2f67dcbf36"
down_revision = "2d208ec50193"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "moments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("author_name", sa.String(), nullable=False),
        sa.Column("author_avatar_url", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_urls", sa.JSON(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_moments_created_at", "moments", ["created_at"], unique=False)

    op.create_table(
        "moment_likes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("moment_id", sa.String(), nullable=False),
        sa.Column("user_name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["moment_id"], ["moments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("moment_id", "user_name", name="uq_moment_like_user"),
    )
    op.create_index("ix_moment_likes_moment_id", "moment_likes", ["moment_id"], unique=False)

    op.create_table(
        "moment_comments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("moment_id", sa.String(), nullable=False),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("user_name", sa.String(), nullable=False),
        sa.Column("reply_to_name", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["moment_id"], ["moments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["moment_comments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_moment_comments_moment_id", "moment_comments", ["moment_id"], unique=False)
    op.create_index("ix_moment_comments_parent_id", "moment_comments", ["parent_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_moment_comments_parent_id", table_name="moment_comments")
    op.drop_index("ix_moment_comments_moment_id", table_name="moment_comments")
    op.drop_table("moment_comments")

    op.drop_index("ix_moment_likes_moment_id", table_name="moment_likes")
    op.drop_table("moment_likes")

    op.drop_index("ix_moments_created_at", table_name="moments")
    op.drop_table("moments")
