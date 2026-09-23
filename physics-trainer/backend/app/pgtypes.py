"""Column types for "enum" fields used by SQLAlchemy models.

We deliberately do NOT use native PostgreSQL ENUM types: CREATE TYPE is not
transactional, which makes Alembic re-runs fragile (DuplicateObjectError),
and adding a value later requires ALTER TYPE. Instead everything is stored
as VARCHAR; allowed values are enforced at the API layer via Pydantic
Literal/Enum schemas (app.enums). Use EnumVarchar from portable_types so
python str-Enum members are still transparently saved/loaded.
"""
from app.enums import AnswerType, AttemptMode, Difficulty, UserRole
from app.portable_types import EnumVarchar


def pg_enum(py_enum, name: str) -> EnumVarchar:
    return EnumVarchar(py_enum, length=30)


UserRolePG = pg_enum(UserRole, "userrole")
AnswerTypePG = pg_enum(AnswerType, "answertype")
DifficultyPG = pg_enum(Difficulty, "difficulty")
AttemptModePG = pg_enum(AttemptMode, "attemptmode")
