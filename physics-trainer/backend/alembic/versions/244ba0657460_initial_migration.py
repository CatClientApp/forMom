"""initial_migration

Revision ID: 244ba0657460
Revises:
Create Date: 2026-09-23 10:25:28.812200

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '244ba0657460'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NOTE: "enum" columns are plain VARCHAR here (no native PG ENUM types).
    # Native enums caused Alembic DuplicateObjectError headaches; allowed
    # values are enforced by Pydantic schemas on the API layer.

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False, server_default='student'),
        sa.Column('color', sa.String(), nullable=False, server_default='#3B82F6'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Topics table (self-referential tree, max 2 levels enforced in API)
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Articles table (knowledge base)
    op.create_table(
        'articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content_md', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('answer_type', sa.String(length=20), nullable=False, server_default='choice'),
        sa.Column('correct_text', sa.Text(), nullable=True),
        sa.Column('correct_number', sa.Numeric(), nullable=True),
        sa.Column('tolerance', sa.Numeric(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='easy'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Tests table
    op.create_table(
        'tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Task images
    op.create_table(
        'task_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Task options (for answer_type='choice')
    op.create_table(
        'task_options',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Task <-> articles M2M
    op.create_table(
        'task_articles',
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'article_id')
    )

    # Hints (attached to a task or a topic)
    op.create_table(
        'hints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('tier', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('cost', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Test <-> tasks M2M
    op.create_table(
        'test_tasks',
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('test_id', 'task_id')
    )

    # Attempts
    op.create_table(
        'attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_score', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Attempt answers
    op.create_table(
        'attempt_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attempt_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('chosen_option_id', sa.Integer(), nullable=True),
        sa.Column('given_text', sa.Text(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('points_earned', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('hints_used', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('answered_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['attempt_id'], ['attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chosen_option_id'], ['task_options.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('attempt_answers')
    op.drop_table('attempts')
    op.drop_table('test_tasks')
    op.drop_table('hints')
    op.drop_table('task_articles')
    op.drop_table('task_options')
    op.drop_table('task_images')
    op.drop_table('tests')
    op.drop_table('tasks')
    op.drop_table('articles')
    op.drop_table('topics')
    op.drop_table('users')
