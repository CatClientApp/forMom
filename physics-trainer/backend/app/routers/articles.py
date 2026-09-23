from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Topic, Article
from app.schemas import ArticleCreate, ArticleUpdate, ArticleResponse
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=list[ArticleResponse])
async def get_articles(
    topic_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список статей с фильтром по теме"""
    query = select(Article).order_by(Article.created_at.desc())
    if topic_id is not None:
        query = query.where(Article.topic_id == topic_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статью по ID"""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("", response_model=ArticleResponse, status_code=201)
async def create_article(
    article_data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Создать статью (только для учителей)"""
    if article_data.topic_id:
        topic_result = await db.execute(select(Topic).where(Topic.id == article_data.topic_id))
        if not topic_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Topic not found")
    
    new_article = Article(**article_data.model_dump())
    db.add(new_article)
    await db.commit()
    await db.refresh(new_article, attribute_names=[])
    return new_article


@router.patch("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    article_data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Обновить статью (только для учителей)"""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = article_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)
    
    await db.commit()
    await db.refresh(article, attribute_names=[])
    return article


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Удалить статью (только для учителей)"""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    await db.delete(article)
    await db.commit()
    return None
