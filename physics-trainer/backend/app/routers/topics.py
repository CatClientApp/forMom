from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Topic
from app.schemas import TopicCreate, TopicUpdate, TopicResponse
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/topics", tags=["topics"])


async def build_topic_tree(topics: list[Topic]) -> list[dict]:
    """Построить дерево тем из плоского списка"""
    topic_map = {t.id: {**t.__dict__, "children": []} for t in topics if hasattr(t, 'id')}
    root_topics = []
    
    for topic in topics:
        tid = topic.id
        if tid not in topic_map:
            continue
        if topic.parent_id is None:
            root_topics.append(topic_map[tid])
        elif topic.parent_id in topic_map:
            topic_map[topic.parent_id]["children"].append(topic_map[tid])
    
    # Сортируем по order_index
    def sort_topics(lst):
        lst.sort(key=lambda x: x.get("order_index", 0))
        for item in lst:
            sort_topics(item.get("children", []))
    
    sort_topics(root_topics)
    return root_topics


@router.get("", response_model=list[TopicResponse])
async def get_topics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить дерево тем"""
    result = await db.execute(select(Topic).order_by(Topic.order_index))
    topics = result.scalars().all()
    tree = await build_topic_tree(topics)
    return tree


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic_data: TopicCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать тему или подтему"""
    # Проверка: не более 2 уровней
    if topic_data.parent_id is not None:
        parent_result = await db.execute(select(Topic).where(Topic.id == topic_data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent topic not found")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Cannot create subtopic of a subtopic (max 2 levels)")
    
    new_topic = Topic(**topic_data.model_dump())
    db.add(new_topic)
    await db.commit()
    await db.refresh(new_topic, attribute_names=["children"])
    
    # Возвращаем с children
    result = await db.execute(select(Topic).where(Topic.id == new_topic.id))
    topic = result.scalar_one()
    return {**topic.__dict__, "children": []}


@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: int,
    topic_data: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Обновить тему"""
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    update_data = topic_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(topic, field, value)
    
    await db.commit()
    await db.refresh(topic, attribute_names=["children"])
    return {**topic.__dict__, "children": []}


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить тему (если нет подтем, задач и статей)"""
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Проверка на подтемы
    children_result = await db.execute(select(Topic).where(Topic.parent_id == topic_id))
    children = children_result.scalars().first()
    if children:
        raise HTTPException(status_code=400, detail="Cannot delete topic with subtopics")
    
    # Проверка на задачи
    from app.models import Task, Article
    tasks_result = await db.execute(select(Task).where(Task.topic_id == topic_id).limit(1))
    if tasks_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete topic with tasks")
    
    # Проверка на статьи
    articles_result = await db.execute(select(Article).where(Article.topic_id == topic_id).limit(1))
    if articles_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot delete topic with articles")
    
    await db.delete(topic)
    await db.commit()
    return None
