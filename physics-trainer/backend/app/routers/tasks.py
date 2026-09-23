from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Task, TaskImage, TaskOption, TaskArticle, Hint, Topic, Article
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskOptionIn, HintCreate
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def get_tasks(
    topic_id: int | None = None,
    difficulty: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список задач с фильтрами"""
    query = select(Task).order_by(Task.created_at.desc())
    
    if topic_id is not None:
        query = query.where(Task.topic_id == topic_id)
    if difficulty is not None:
        query = query.where(Task.difficulty == difficulty)
    if search is not None:
        query = query.where(Task.title.ilike(f"%{search}%"))
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    # Загружаем связанные данные
    for task in tasks:
        await db.refresh(task)
    
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить задачу по ID с картинками, опциями и статьями"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.refresh(task)
    return task


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать задачу (только для учителей)"""
    # Проверка темы
    topic_result = await db.execute(select(Topic).where(Topic.id == task_data.topic_id))
    if not topic_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Для choice-ответов обязательно наличие опций
    if task_data.answer_type == "choice":
        if not task_data.options or len(task_data.options) < 2:
            raise HTTPException(status_code=400, detail="Choice task must have at least 2 options")
        # Проверка: ровно один правильный ответ
        correct_count = sum(1 for opt in task_data.options if opt.is_correct)
        if correct_count != 1:
            raise HTTPException(status_code=400, detail="Exactly one option must be correct")
    
    # Создание задачи
    task_dict = task_data.model_dump(exclude={"options", "article_ids"})
    new_task = Task(**task_dict, created_by=teacher.id)
    db.add(new_task)
    await db.flush()  # Чтобы получить ID
    
    # Создание опций если есть
    if task_data.options:
        for idx, opt in enumerate(task_data.options):
            option = TaskOption(
                task_id=new_task.id,
                text=opt.text,
                is_correct=opt.is_correct,
                order_index=opt.order_index if opt.order_index else idx
            )
            db.add(option)

    # Привязка статей
    for aid in set(task_data.article_ids or []):
        db.add(TaskArticle(task_id=new_task.id, article_id=aid))

    await db.commit()
    await db.refresh(new_task)
    return new_task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Обновить задачу (только для учителей)"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_data.model_dump(exclude_unset=True, exclude={"options", "article_ids"})
    for field, value in update_data.items():
        setattr(task, field, value)

    # Полная замена вариантов ответа
    if task_data.options is not None:
        if task.answer_type == "choice":
            correct_count = sum(1 for opt in task_data.options if opt.is_correct)
            if correct_count != 1:
                raise HTTPException(status_code=400, detail="Exactly one option must be correct")
        existing_options = await db.execute(select(TaskOption).where(TaskOption.task_id == task.id))
        for opt in existing_options.scalars().all():
            await db.delete(opt)
        await db.flush()
        for idx, opt in enumerate(task_data.options):
            db.add(TaskOption(task_id=task.id, text=opt.text, is_correct=opt.is_correct,
                              order_index=opt.order_index if opt.order_index else idx))

    # Полная замена привязанных статей
    if task_data.article_ids is not None:
        existing_links = await db.execute(select(TaskArticle).where(TaskArticle.task_id == task.id))
        for link in existing_links.scalars().all():
            await db.delete(link)
        await db.flush()
        for aid in set(task_data.article_ids):
            db.add(TaskArticle(task_id=task.id, article_id=aid))
    
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить задачу (только для учителей)"""
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    return None


@router.post("/{task_id}/images")
async def add_task_image(
    task_id: int,
    url: str,
    order_index: int = 0,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Добавить изображение к задаче"""
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    image = TaskImage(task_id=task_id, url=url, order_index=order_index)
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/{task_id}/images/{image_id}", status_code=204)
async def delete_task_image(
    task_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить изображение задачи"""
    result = await db.execute(
        select(TaskImage).where(TaskImage.id == image_id, TaskImage.task_id == task_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    await db.delete(image)
    await db.commit()
    return None


@router.post("/{task_id}/articles", status_code=201)
async def attach_article_to_task(
    task_id: int,
    article_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Привязать статью к задаче"""
    # Проверка существования
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")
    
    article_result = await db.execute(select(Article).where(Article.id == article_id))
    if not article_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Проверка на дубликат
    existing = await db.execute(
        select(TaskArticle).where(TaskArticle.task_id == task_id, TaskArticle.article_id == article_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Article already attached")
    
    task_article = TaskArticle(task_id=task_id, article_id=article_id)
    db.add(task_article)
    await db.commit()
    return {"status": "ok"}


@router.delete("/{task_id}/articles/{article_id}", status_code=204)
async def detach_article_from_task(
    task_id: int,
    article_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Отвязать статью от задачи"""
    result = await db.execute(
        select(TaskArticle).where(TaskArticle.task_id == task_id, TaskArticle.article_id == article_id)
    )
    task_article = result.scalar_one_or_none()
    if not task_article:
        raise HTTPException(status_code=404, detail="Association not found")
    
    await db.delete(task_article)
    await db.commit()
    return None


@router.post("/{task_id}/hints", response_model=HintCreate, status_code=201)
async def create_hint(
    task_id: int,
    hint_data: HintCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать подсказку для задачи"""
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_hint = Hint(**hint_data.model_dump(), task_id=task_id)
    db.add(new_hint)
    await db.commit()
    await db.refresh(new_hint)
    return new_hint


@router.delete("/hints/{hint_id}", status_code=204)
async def delete_hint(
    hint_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить подсказку"""
    result = await db.execute(select(Hint).where(Hint.id == hint_id))
    hint = result.scalar_one_or_none()
    if not hint:
        raise HTTPException(status_code=404, detail="Hint not found")
    
    await db.delete(hint)
    await db.commit()
    return None
