"""add_user_id_column

Revision ID: ba68fd6761d9
Revises: 
Create Date: 2025-12-17 16:07:28.046528

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba68fd6761d9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('memories', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'memories', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'memories', type_='foreignkey')
    op.drop_column('memories', 'user_id')
