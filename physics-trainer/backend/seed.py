#!/usr/bin/env python3
"""
Seed script - создает первого учителя и демо-данные
Запускается автоматически при старте контейнера
"""
import asyncio
import sys
sys.path.insert(0, "/app")

from sqlalchemy import select
from app.database import async_session_maker
from app.models import User, Topic, Article, Task, TaskOption
from app.enums import UserRole, Difficulty, AnswerType


async def seed():
    # Схема создаётся миграциями Alembic в entrypoint — здесь только данные.
    async with async_session_maker() as db:
        # Проверка есть ли уже пользователи
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        if users:
            print("Users already exist, skipping seed...")
            return
        
        # Создаем учителя "Мама"
        teacher = User(
            name="Мама",
            role=UserRole.teacher,
            color="#EC4899"
        )
        db.add(teacher)
        
        # Создаем пару учеников
        student1 = User(name="Саша", role=UserRole.student, color="#3B82F6")
        student2 = User(name="Дима", role=UserRole.student, color="#10B981")
        db.add(student1)
        db.add(student2)
        
        await db.flush()
        
        # Создаем демо-темы
        mechanics = Topic(name="Механика", order_index=0)
        db.add(mechanics)
        
        await db.flush()
        
        kinematics = Topic(name="Кинематика", parent_id=mechanics.id, order_index=0)
        dynamics = Topic(name="Динамика", parent_id=mechanics.id, order_index=1)
        db.add(kinematics)
        db.add(dynamics)
        
        electricity = Topic(name="Электричество", order_index=1)
        db.add(electricity)
        
        await db.flush()
        
        # Демо-статья
        article = Article(
            title="Законы Ньютона",
            content_md="""# Законы Ньютона

## Первый закон
Тело сохраняет состояние покоя или равномерного прямолинейного движения, пока на него не подействует сила.

## Второй закон
$$F = ma$$

## Третий закон
Сила действия равна силе противодействия.
""",
            topic_id=dynamics.id
        )
        db.add(article)
        
        await db.flush()
        
        # Демо-задача
        task = Task(
            topic_id=dynamics.id,
            title="Второй закон Ньютона",
            text="Тело массой 5 кг движется с ускорением 2 м/с². Чему равна сила?",
            answer_type=AnswerType.choice,
            points=10,
            difficulty=Difficulty.easy,
            explanation="По второму закону Ньютона: F = ma = 5 · 2 = 10 Н",
            created_by=teacher.id
        )
        db.add(task)
        
        await db.flush()
        
        # Варианты ответа (ровно 4, один правильный)
        options = [
            TaskOption(task_id=task.id, text="5 Н", is_correct=False, order_index=0),
            TaskOption(task_id=task.id, text="10 Н", is_correct=True, order_index=1),
            TaskOption(task_id=task.id, text="2.5 Н", is_correct=False, order_index=2),
            TaskOption(task_id=task.id, text="20 Н", is_correct=False, order_index=3),
        ]
        for opt in options:
            db.add(opt)
        
        await db.commit()
        
        print("Seed completed successfully!")
        print(f"Created teacher: {teacher.name} (id={teacher.id})")
        print(f"Created students: {student1.name}, {student2.name}")
        print(f"Created topics: Механика (with subtopics), Электричество")
        print(f"Created demo task and article")


if __name__ == "__main__":
    asyncio.run(seed())
