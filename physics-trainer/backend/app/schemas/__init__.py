from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    teacher = "teacher"
    student = "student"


class AnswerType(str, Enum):
    choice = "choice"
    numeric = "numeric"
    text = "text"


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class AttemptMode(str, Enum):
    practice = "practice"
    test = "test"


# === USER ===
class UserBase(BaseModel):
    name: str
    role: UserRole = UserRole.student
    color: str = "#3B82F6"


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    color: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# === TOPIC ===
class TopicBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    order_index: int = 0


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    order_index: Optional[int] = None


class TopicResponse(TopicBase):
    id: int
    created_at: datetime
    children: List["TopicResponse"] = []

    class Config:
        from_attributes = True


# === ARTICLE ===
class ArticleBase(BaseModel):
    title: str
    content_md: str
    topic_id: Optional[int] = None


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content_md: Optional[str] = None
    topic_id: Optional[int] = None


class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# === TASK OPTION ===
class TaskOptionBase(BaseModel):
    text: str
    is_correct: bool = False
    order_index: int = 0


class TaskOptionCreate(TaskOptionBase):
    pass


class TaskOptionResponse(TaskOptionBase):
    id: int
    task_id: int

    class Config:
        from_attributes = True


# === TASK IMAGE ===
class TaskImageResponse(BaseModel):
    id: int
    url: str
    order_index: int

    class Config:
        from_attributes = True


# === HINT ===
class HintBase(BaseModel):
    topic_id: Optional[int] = None
    tier: int
    cost: int = 0
    content: str


class HintCreate(HintBase):
    pass


class HintResponse(HintBase):
    id: int

    class Config:
        from_attributes = True


# === TASK ===
class TaskOptionIn(BaseModel):
    text: str
    is_correct: bool
    order_index: int = 0


class TaskCreate(BaseModel):
    topic_id: int
    title: str
    text: Optional[str] = None
    answer_type: AnswerType = AnswerType.choice
    correct_text: Optional[str] = None
    correct_number: Optional[float] = None
    tolerance: Optional[float] = None
    unit: Optional[str] = None
    points: int = 1
    difficulty: Difficulty = Difficulty.medium
    explanation: Optional[str] = None
    options: Optional[List[TaskOptionIn]] = None
    article_ids: List[int] = []


class TaskUpdate(BaseModel):
    topic_id: Optional[int] = None
    title: Optional[str] = None
    text: Optional[str] = None
    answer_type: Optional[AnswerType] = None
    correct_text: Optional[str] = None
    correct_number: Optional[float] = None
    tolerance: Optional[float] = None
    unit: Optional[str] = None
    points: Optional[int] = None
    difficulty: Optional[Difficulty] = None
    explanation: Optional[str] = None
    options: Optional[List[TaskOptionIn]] = None
    article_ids: Optional[List[int]] = None


class TaskResponse(BaseModel):
    id: int
    topic_id: int
    title: str
    text: Optional[str] = None
    answer_type: AnswerType
    correct_text: Optional[str] = None
    correct_number: Optional[float] = None
    tolerance: Optional[float] = None
    unit: Optional[str] = None
    points: int
    difficulty: Difficulty
    explanation: Optional[str] = None
    created_by: int
    created_at: datetime
    images: List[TaskImageResponse] = []
    options: List[TaskOptionResponse] = []
    hints: List[HintResponse] = []
    article_ids: List[int] = []

    class Config:
        from_attributes = True


# === ATTEMPT ===
class AttemptAnswerCreate(BaseModel):
    task_id: int
    chosen_option_id: Optional[int] = None
    given_text: Optional[str] = None
    hints_used: List[int] = []


class AttemptPracticeCreate(BaseModel):
    task_id: int


class AttemptAnswerResponse(BaseModel):
    is_correct: bool
    points_earned: int
    correct_option_id: Optional[int] = None
    explanation: Optional[str] = None
    max_score: int


# === TEST ===
class TestTaskAdd(BaseModel):
    task_id: int
    order_index: int = 0


class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic_id: Optional[int] = None
    time_limit_sec: Optional[int] = None


class TestCreate(TestBase):
    pass


class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topic_id: Optional[int] = None
    time_limit_sec: Optional[int] = None


class TestResponse(TestBase):
    id: int
    created_by: int
    created_at: datetime
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True


class TaskImageCreate(BaseModel):
    url: str
    order_index: int = 0


class AttemptAnswerDetail(BaseModel):
    id: int
    task_id: int
    chosen_option_id: Optional[int] = None
    given_text: Optional[str] = None
    is_correct: Optional[bool] = None
    points_earned: int
    hints_used: List[int] = []

    class Config:
        from_attributes = True
