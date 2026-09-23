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
    # Create enum types
    op.execute("CREATE TYPE userrole AS ENUM ('teacher', 'student')")
    op.execute("CREATE TYPE answertype AS ENUM ('choice', 'numeric', 'text')")
    op.execute("CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard')")
    op.execute("CREATE TYPE attemptmode AS ENUM ('practice', 'test')")

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('teacher', 'student', name='userrole'), nullable=False, server_default='student'),
        sa.Column('color', sa.String(), nullable=False, server_default='#3B82F6'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # Topics table (self-referential for tree structure)
    op.create_table(
        'topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('order_index', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['parent_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_topics_id'), 'topics', ['id'], unique=False)

    # Articles table
    op.create_table(
        'articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content_md', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_articles_id'), 'articles', ['id'], unique=False)

    # Tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('answer_type', sa.Enum('choice', 'numeric', 'text', name='answertype'), nullable=False, server_default='choice'),
        sa.Column('correct_text', sa.String(), nullable=True),
        sa.Column('correct_number', sa.Numeric(), nullable=True),
        sa.Column('tolerance', sa.Numeric(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('points', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('difficulty', sa.Enum('easy', 'medium', 'hard', name='difficulty'), nullable=False, server_default='medium'),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks', ['id'], unique=False)

    # Task images table
    op.create_table(
        'task_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('order_index', sa.Integer(), default=0),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_images_id'), 'task_images', ['id'], unique=False)

    # Task options table (for choice answers)
    op.create_table(
        'task_options',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('text', sa.String(), nullable=False),
        sa.Column('is_correct', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('order_index', sa.Integer(), default=0),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_options_id'), 'task_options', ['id'], unique=False)

    # Task-Article many-to-many table
    op.create_table(
        'task_articles',
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('article_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['article_id'], ['articles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'article_id')
    )

    # Hints table
    op.create_table(
        'hints',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('tier', sa.Integer(), nullable=False),
        sa.Column('cost', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_hints_id'), 'hints', ['id'], unique=False)

    # Tests table
    op.create_table(
        'tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('topic_id', sa.Integer(), nullable=True),
        sa.Column('time_limit_sec', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topics.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tests_id'), 'tests', ['id'], unique=False)

    # Test-Tasks many-to-many table
    op.create_table(
        'test_tasks',
        sa.Column('test_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('order_index', sa.Integer(), default=0),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('test_id', 'task_id')
    )

    # Attempts table
    op.create_table(
        'attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mode', sa.Enum('practice', 'test', name='attemptmode'), nullable=False),
        sa.Column('test_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('score', sa.Integer(), default=0),
        sa.Column('max_score', sa.Integer(), default=0),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attempts_id'), 'attempts', ['id'], unique=False)

    # Attempt answers table
    op.create_table(
        'attempt_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('attempt_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('chosen_option_id', sa.Integer(), nullable=True),
        sa.Column('given_text', sa.String(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=False),
        sa.Column('points_earned', sa.Integer(), nullable=False),
        sa.Column('hints_used', sa.JSON(), nullable=True),
        sa.Column('answered_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['attempt_id'], ['attempts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chosen_option_id'], ['task_options.id'], ),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attempt_answers_id'), 'attempt_answers', ['id'], unique=False)


def downgrade() -> None:
    op.drop_table('attempt_answers')
    op.drop_table('attempts')
    op.drop_table('test_tasks')
    op.drop_table('tests')
    op.drop_table('hints')
    op.drop_table('task_articles')
    op.drop_table('task_options')
    op.drop_table('task_images')
    op.drop_table('tasks')
    op.drop_table('articles')
    op.drop_table('topics')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS attemptmode")
    op.execute("DROP TYPE IF EXISTS difficulty")
    op.execute("DROP TYPE IF EXISTS answertype")
    op.execute("DROP TYPE IF EXISTS userrole")
