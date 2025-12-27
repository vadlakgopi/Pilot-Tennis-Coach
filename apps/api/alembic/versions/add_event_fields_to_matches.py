"""add_event_fields_to_matches

Revision ID: add_event_fields
Revises: 725e6e0e9cdd
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_event_fields'
down_revision: Union[str, None] = '725e6e0e9cdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('matches', sa.Column('event', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('event_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('matches', sa.Column('bracket', sa.String(), nullable=True))
    op.add_column('matches', sa.Column('uploader_notes', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('matches', 'uploader_notes')
    op.drop_column('matches', 'bracket')
    op.drop_column('matches', 'event_date')
    op.drop_column('matches', 'event')




