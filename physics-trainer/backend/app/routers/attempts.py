from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import User, Task, TaskOption, Attempt, AttemptAnswer, Hint
from app.schemas import AttemptPracticeCreate, AttemptAnswerCreate, AttemptAnswerResponse
from app.deps import get_current_user


router = APIRouter(prefix="/attempts", tags=["attempts"])


async def check_answer(task, chosen_option_id=None, given_text=None):
    """Проверка ответа"""
    if task.answer_type == "choice":
        # Ищем правильный вариант
        correct_option = None
        for opt in task.options:
            if opt.is_correct:
                correct_option = opt
                break
        
        is_correct = chosen_option_id == correct_option.id if correct_option else False
        return {
            "is_correct": is_correct,
            "correct_option_id": correct_option.id if correct_option else None
        }
    
    elif task.answer_type == "numeric":
        if given_text is None:
            return {"is_correct": False}
        
        # Нормализация: запятая -> точка
        given_str = str(given_text).replace(",", ".").strip()
        try:
            given_num = float(given_str)
        except ValueError:
            return {"is_correct": False}
        
        correct_num = float(task.correct_number)
        tolerance = float(task.tolerance) if task.tolerance is not None else 0
        
        is_correct = abs(given_num - correct_num) <= tolerance
        return {"is_correct": is_correct}
    
    elif task.answer_type == "text":
        if given_text is None:
            return {"is_correct": False}
        
        # Нормализация
        def normalize(s):
            s = str(s).strip().lower()
            s = " ".join(s.split())  # Убрать лишние пробелы
            # Унификация некоторых символов
            s = s.replace("н", "n").replace("Н", "n")
            s = s.replace("кг", "kg").replace("КГ", "kg")
            return s
        
        given_normalized = normalize(given_text)
        correct_normalized = normalize(task.correct_text)
        
        # Поддержка альтернатив через |
        if "|" in correct_normalized:
            variants = [v.strip() for v in correct_normalized.split("|")]
            is_correct = given_normalized in variants
        else:
            is_correct = given_normalized == correct_normalized
        
        return {"is_correct": is_correct}
    
    return {"is_correct": False}


@router.post("/practice")
async def start_practice(
    data: AttemptPracticeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Начать практику по конкретной задаче"""
    task_result = await db.execute(select(Task).where(Task.id == data.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    attempt = Attempt(
        user_id=current_user.id,
        mode="practice",
        test_id=None
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt, attribute_names=["answers"])
    
    return {"attempt_id": attempt.id}


@router.post("/practice/{attempt_id}/answer", response_model=AttemptAnswerResponse)
async def answer_practice(
    attempt_id: int,
    data: AttemptAnswerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ответить на задачу в режиме практики"""
    # Проверка попытки
    attempt_result = await db.execute(
        select(Attempt).where(Attempt.id == attempt_id, Attempt.user_id == current_user.id)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    # Задача
    task_result = await db.execute(select(Task).where(Task.id == data.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Проверка ответа
    result = await check_answer(task, data.chosen_option_id, data.given_text)
    is_correct = result["is_correct"]
    
    # Расчет баллов: вычитаем стоимость реально открытых подсказок
    points_earned = 0
    if is_correct:
        hints_cost = 0
        if data.hints_used:
            hint_result = await db.execute(select(Hint).where(Hint.id.in_(data.hints_used)))
            hints_cost = sum(h.cost for h in hint_result.scalars().all())
        points_earned = max(0, task.points - hints_cost)
    
    # Сохранение ответа
    answer = AttemptAnswer(
        attempt_id=attempt_id,
        task_id=data.task_id,
        chosen_option_id=data.chosen_option_id,
        given_text=data.given_text,
        is_correct=is_correct,
        points_earned=points_earned,
        hints_used=data.hints_used
    )
    db.add(answer)
    
    # Обновление счета попытки
    attempt.score += points_earned
    attempt.max_score += task.points
    
    await db.commit()
    
    return AttemptAnswerResponse(
        is_correct=is_correct,
        points_earned=points_earned,
        correct_option_id=result.get("correct_option_id"),
        explanation=task.explanation,
        max_score=attempt.max_score
    )


@router.get("/my")
async def get_my_attempts(
    mode: str | None = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить историю попыток текущего пользователя"""
    query = select(Attempt).where(Attempt.user_id == current_user.id).order_by(Attempt.started_at.desc())
    if mode:
        query = query.where(Attempt.mode == mode)
    query = query.limit(limit)
    
    result = await db.execute(query)
    attempts = result.scalars().all()
    return attempts
