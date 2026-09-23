from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os
import io
from PIL import Image

from app.database import get_db
from app.models import User, Task, TaskImage
from app.deps import get_current_user, require_teacher
from app.config import settings


router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    teacher: User = Depends(require_teacher)
):
    """Загрузить изображение для задачи"""
    # Валидация типа файла
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP allowed")
    
    # Чтение файла
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    # Обработка через Pillow
    img = Image.open(io.BytesIO(content))
    
    # Ресайз по большей стороне до 1920px
    max_size = 1920
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # Конвертация в RGB (на случай RGBA)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # Генерация уникального имени
    filename = f"{uuid.uuid4()}.jpg"
    upload_path = os.path.join(settings.UPLOAD_DIR, "tasks")
    os.makedirs(upload_path, exist_ok=True)
    filepath = os.path.join(upload_path, filename)
    
    # Сохранение с quality=85
    img.save(filepath, "JPEG", quality=85)
    
    url = f"/uploads/tasks/{filename}"
    return {"url": url}
