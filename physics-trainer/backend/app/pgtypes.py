"""PostgreSQL enum types used by SQLAlchemy models.

Each type is declared once with an explicit PG name and create_type=False,
so SQLAlchemy never emits CREATE TYPE / DROP TYPE DDL. Alembic migrations
own the lifecycle of these types (created explicitly in 0001_initial).
"""
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

from app.enums import AnswerType, AttemptMode, Difficulty, UserRole


def pg_enum(py_enum, name: str) -> PgEnum:
    return PgEnum(
        py_enum,
        name=name,
        values_callable=lambda e: [m.value for m in e],
        create_type=False,
    )


UserRolePG = pg_enum(UserRole, "userrole")
AnswerTypePG = pg_enum(AnswerType, "answertype")
DifficultyPG = pg_enum(Difficulty, "difficulty")
AttemptModePG = pg_enum(AttemptMode, "attemptmode")
