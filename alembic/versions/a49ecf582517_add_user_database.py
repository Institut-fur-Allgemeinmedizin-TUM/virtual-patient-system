"""add user database

Revision ID: a49ecf582517
Revises: 8a1ced8bca69
Create Date: 2026-05-18 15:49:17.898873

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a49ecf582517"
down_revision: Union[str, Sequence[str], None] = "8a1ced8bca69"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("oidc_id", sa.String(length=255), nullable=True),
        sa.Column("pronouns", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("oidc_id"),
    )

    # Create user_roles association table
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    # Data Migration: Generate users for all existing OIDC IDs in sessions
    # We use gen_random_uuid() which is built-in for modern PostgreSQL versions.
    op.execute("""
        INSERT INTO users (id, oidc_id, pronouns, created_at)
        SELECT gen_random_uuid(), user_id, 'not_specified', now()
        FROM (SELECT DISTINCT user_id FROM sessions WHERE user_id IS NOT NULL) AS unique_ids
        ON CONFLICT (oidc_id) DO NOTHING
    """)

    # Add foreign key constraint to users table (using oidc_id as the link)
    op.create_foreign_key(
        "fk_sessions_user_id", "sessions", "users", ["user_id"], ["oidc_id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraint
    op.drop_constraint("fk_sessions_user_id", "sessions", type_="foreignkey")

    # Drop new tables
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("roles")
