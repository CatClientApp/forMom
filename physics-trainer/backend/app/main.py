from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, async_session_maker, Base
from app.config import settings
from app.routers import users, topics, articles, tasks, uploads, tests, attempts, stats


async def init_db():
    """Инициализация БД - создание таблиц"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app = FastAPI(title="Physics Trainer API")

# CORS для локалки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключение роутеров
app.include_router(users.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(tests.router, prefix="/api")
app.include_router(attempts.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


# Статика для загруженных файлов
uploads_dir = settings.UPLOAD_DIR
os.makedirs(uploads_dir, exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "tasks"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.on_event("startup")
async def startup_event():
    """При старте создаем таблицы если их нет"""
    await init_db()


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
