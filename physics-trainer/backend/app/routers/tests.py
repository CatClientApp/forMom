from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Test, TestTask, Task
from app.schemas import TestCreate, TestUpdate, TestResponse, TestTaskAdd
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("", response_model=list[TestResponse])
async def get_tests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список тестов"""
    result = await db.execute(select(Test).order_by(Test.created_at.desc()))
    return result.scalars().all()


@router.get("/{test_id}", response_model=TestResponse)
async def get_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить тест по ID с задачами"""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    await db.refresh(test)
    return test


@router.post("", response_model=TestResponse, status_code=201)
async def create_test(
    test_data: TestCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать тест (только для учителей)"""
    new_test = Test(**test_data.model_dump(), created_by=teacher.id)
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    return new_test


@router.patch("/{test_id}", response_model=TestResponse)
async def update_test(
    test_id: int,
    test_data: TestUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Обновить тест (только для учителей)"""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    update_data = test_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(test, field, value)
    
    await db.commit()
    await db.refresh(test)
    return test


@router.delete("/{test_id}", status_code=204)
async def delete_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить тест (только для учителей)"""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    await db.delete(test)
    await db.commit()
    return None


@router.post("/{test_id}/tasks", status_code=201)
async def add_task_to_test(
    test_id: int,
    task_data: TestTaskAdd,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Добавить задачу в тест"""
    # Проверка теста
    test_result = await db.execute(select(Test).where(Test.id == test_id))
    if not test_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Проверка задачи
    task_result = await db.execute(select(Task).where(Task.id == task_data.task_id))
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверка на дубликат
    existing = await db.execute(
        select(TestTask).where(TestTask.test_id == test_id, TestTask.task_id == task_data.task_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Task already in test")
    
    test_task = TestTask(
        test_id=test_id,
        task_id=task_data.task_id,
        order_index=task_data.order_index
    )
    db.add(test_task)
    await db.commit()
    return {"status": "ok"}


@router.delete("/{test_id}/tasks/{task_id}", status_code=204)
async def remove_task_from_test(
    test_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить задачу из теста"""
    result = await db.execute(
        select(TestTask).where(TestTask.test_id == test_id, TestTask.task_id == task_id)
    )
    test_task = result.scalar_one_or_none()
    if not test_task:
        raise HTTPException(status_code=404, detail="Association not found")
    
    await db.delete(test_task)
    await db.commit()
    return None
