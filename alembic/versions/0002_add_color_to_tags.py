"""add color to tags

Revision ID: 0002_add_color_to_tags
Revises: 0001_initial
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_color_to_tags"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def generate_tag_color(name: str) -> str:
    colors = [
        '#ef4444',  # red
        '#f97316',  # orange
        '#eab308',  # yellow
        '#22c55e',  # green
        '#06b6d4',  # cyan
        '#3b82f6',  # blue
        '#8b5cf6',  # violet
        '#ec4899',  # pink
        '#6b7280',  # gray
    ]
    hash_value = hash(name) % len(colors)
    return colors[hash_value]


def upgrade() -> None:
    op.add_column("tags", sa.Column("color", sa.String(length=7), nullable=False, server_default="#6366f1"))
    
    # Update existing tags with generated colors
    connection = op.get_bind()
    tags = connection.execute(sa.text("SELECT id, name FROM tags")).fetchall()
    for tag_id, name in tags:
        color = generate_tag_color(name)
        connection.execute(
            sa.text("UPDATE tags SET color = :color WHERE id = :id"),
            {"color": color, "id": tag_id}
        )


def downgrade() -> None:
    op.drop_column("tags", "color")