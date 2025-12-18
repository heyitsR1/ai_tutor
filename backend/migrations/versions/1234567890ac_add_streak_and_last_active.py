"""add streak and last active

Revision ID: 1234567890ac
Revises: 1234567890ab
Create Date: 2025-12-17 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1234567890ac'
down_revision: Union[str, None] = '1234567890ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('streak_days', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('last_active_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_active_date')
    op.drop_column('users', 'streak_days')
