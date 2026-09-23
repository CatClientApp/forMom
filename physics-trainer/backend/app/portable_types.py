"""Portable enum columns.

PostgreSQL native ENUM types are a known source of Alembic headaches
(CREATE TYPE is not transactional, duplicate-object errors on re-runs,
ALTER TYPE pain when adding values). For this home project all "enums"
are stored as VARCHAR; value validation happens in Pydantic schemas via
app.enums (str Enums). Use EnumVarchar(UserRole) in models and
sa.String(...) in migrations.
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


class EnumVarchar(postgresql.VARCHAR):
    """VARCHAR that transparently stores/loads python str-Enum members."""

    cache_ok = True

    def __init__(self, enum_cls, length: int = 30):
        self.enum_cls = enum_cls
        super().__init__(length=length)

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            return value.value if isinstance(value, self.enum_cls) else str(value)

        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            return self.enum_cls(value)

        return process
