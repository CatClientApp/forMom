from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.schemas import UserRole


async def get_current_user(
    x_user_id: int,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Получить текущего пользователя из заголовка X-User-Id"""
    result = await db.execute(select(User).where(User.id == x_user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


async def require_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    """Проверить, что пользователь - учитель"""
    if current_user.role != UserRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can perform this action"
        )
    return current_user
