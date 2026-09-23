from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserUpdate, UserResponse, UserRole
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список всех пользователей"""
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать нового пользователя (только для учителей)"""
    new_user = User(**user_data.model_dump())
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Обновить пользователя (только для учителей)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить пользователя (только для учителей)"""
    # Нельзя удалить себя
    if user_id == teacher.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Нельзя удалить последнего учителя
    teachers_result = await db.execute(select(User).where(User.role == UserRole.teacher))
    teachers = teachers_result.scalars().all()
    if len(teachers) == 1 and teachers[0].id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete the last teacher")
    
    await db.delete(user)
    await db.commit()
    return None
