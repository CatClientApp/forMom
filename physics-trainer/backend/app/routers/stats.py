from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import User, Attempt, AttemptAnswer, Task
from app.deps import get_current_user, require_teacher


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/me/summary")
async def get_my_stats_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить сводную статистику текущего пользователя"""
    # Всего попыток
    attempts_result = await db.execute(
        select(func.count(Attempt.id)).where(Attempt.user_id == current_user.id)
    )
    total_attempts = attempts_result.scalar() or 0
    
    # Решено задач (уникальных)
    solved_result = await db.execute(
        select(func.count(func.distinct(AttemptAnswer.task_id)))
        .where(AttemptAnswer.attempt_id.in_(
            select(Attempt.id).where(Attempt.user_id == current_user.id)
        ))
        .where(AttemptAnswer.is_correct == True)
    )
    solved_count = solved_result.scalar() or 0
    
    # Точность
    accuracy_result = await db.execute(
        select(func.count(AttemptAnswer.id))
        .where(AttemptAnswer.attempt_id.in_(
            select(Attempt.id).where(Attempt.user_id == current_user.id)
        ))
    )
    total_answers = accuracy_result.scalar() or 0
    
    correct_result = await db.execute(
        select(func.count(AttemptAnswer.id))
        .where(AttemptAnswer.attempt_id.in_(
            select(Attempt.id).where(Attempt.user_id == current_user.id)
        ))
        .where(AttemptAnswer.is_correct == True)
    )
    correct_count = correct_result.scalar() or 0
    
    accuracy = (correct_count / total_answers * 100) if total_answers > 0 else 0
    
    # Баллы
    points_result = await db.execute(
        select(func.sum(Attempt.score))
        .where(Attempt.user_id == current_user.id)
    )
    total_points = points_result.scalar() or 0
    
    return {
        "total_attempts": total_attempts,
        "solved_count": solved_count,
        "accuracy": round(accuracy, 1),
        "total_points": total_points
    }


@router.get("/me/topics")
async def get_my_stats_by_topics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Статистика по темам"""
    # Упрощенная версия - просто список тем с количеством решенных
    query = """
    SELECT t.id, t.name, 
           COUNT(DISTINCT CASE WHEN aa.is_correct THEN aa.task_id END) as solved,
           COUNT(DISTINCT aa.task_id) as attempted
    FROM topics t
    LEFT JOIN tasks tk ON tk.topic_id = t.id
    LEFT JOIN attempt_answers aa ON aa.task_id = tk.id
    LEFT JOIN attempts a ON a.id = aa.attempt_id AND a.user_id = :user_id
    GROUP BY t.id, t.name
    ORDER BY t.name
    """
    result = await db.execute(
        select(Task.topic_id, func.count(Task.id))
        .where(Task.id.in_(
            select(AttemptAnswer.task_id)
            .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
            .where(Attempt.user_id == current_user.id)
        ))
        .group_by(Task.topic_id)
    )
    
    topics_stats = []
    for row in result.all():
        topics_stats.append({
            "topic_id": row[0],
            "solved": row[1]
        })
    
    return topics_stats


@router.get("/me/errors", response_model=list[dict])
async def get_my_errors(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Последние неверные ответы"""
    query = (
        select(AttemptAnswer, Task.title)
        .join(Task, AttemptAnswer.task_id == Task.id)
        .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
        .where(Attempt.user_id == current_user.id)
        .where(AttemptAnswer.is_correct == False)
        .order_by(AttemptAnswer.answered_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    
    errors = []
    for row in result.all():
        answer = row[0]
        errors.append({
            "task_id": answer.task_id,
            "task_title": row[1],
            "answered_at": answer.answered_at
        })
    
    return errors


@router.get("/students")
async def get_students_stats(
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Сводка по всем ученикам (только для учителей)"""
    students_result = await db.execute(
        select(User).where(User.role == "student")
    )
    students = students_result.scalars().all()
    
    stats = []
    for student in students:
        # Всего попыток
        attempts_result = await db.execute(
            select(func.count(Attempt.id)).where(Attempt.user_id == student.id)
        )
        total_attempts = attempts_result.scalar() or 0
        
        # Всего баллов
        points_result = await db.execute(
            select(func.sum(Attempt.score)).where(Attempt.user_id == student.id)
        )
        total_points = points_result.scalar() or 0
        
        stats.append({
            "user_id": student.id,
            "name": student.name,
            "total_attempts": total_attempts,
            "total_points": total_points or 0
        })
    
    return stats


@router.get("/students/{user_id}/topics")
async def get_student_stats_by_topics(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Статистика ученика по темам (только для учителей)"""
    # Проверка что пользователь существует
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return {"error": "User not found"}
    
    query = (
        select(Task.topic_id, func.count(AttemptAnswer.id))
        .join(AttemptAnswer, AttemptAnswer.task_id == Task.id)
        .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
        .where(Attempt.user_id == user_id)
        .where(AttemptAnswer.is_correct == True)
        .group_by(Task.topic_id)
    )
    result = await db.execute(query)
    
    stats = []
    for row in result.all():
        stats.append({
            "topic_id": row[0],
            "solved": row[1]
        })
    
    return stats
