from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, ForeignKey, Boolean, Text, Numeric, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.enums import UserRole, AnswerType, Difficulty, AttemptMode


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.student)
    color = Column(String, nullable=False, default="#3B82F6")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tasks_created = relationship("Task", back_populates="creator", foreign_keys="Task.created_by")
    tests_created = relationship("Test", back_populates="creator", foreign_keys="Test.created_by")
    attempts = relationship("Attempt", back_populates="user")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    parent = relationship("Topic", remote_side=[id], backref="children")
    articles = relationship("Article", back_populates="topic")
    tasks = relationship("Task", back_populates="topic")
    hints = relationship("Hint", back_populates="topic")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    title = Column(String, nullable=False)
    content_md = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    topic = relationship("Topic", back_populates="articles")
    task_articles = relationship("TaskArticle", back_populates="article", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    title = Column(String, nullable=False)
    text = Column(Text, nullable=True)
    answer_type = Column(SQLEnum(AnswerType), nullable=False, default=AnswerType.choice)
    correct_text = Column(String, nullable=True)
    correct_number = Column(Numeric, nullable=True)
    tolerance = Column(Numeric, nullable=True)
    unit = Column(String, nullable=True)
    points = Column(Integer, nullable=False, default=1)
    difficulty = Column(SQLEnum(Difficulty), nullable=False, default=Difficulty.medium)
    explanation = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    topic = relationship("Topic", back_populates="tasks")
    creator = relationship("User", back_populates="tasks_created", foreign_keys=[created_by])
    images = relationship("TaskImage", back_populates="task", cascade="all, delete-orphan", order_by="TaskImage.order_index")
    options = relationship("TaskOption", back_populates="task", cascade="all, delete-orphan", order_by="TaskOption.order_index")
    task_articles = relationship("TaskArticle", back_populates="task", cascade="all, delete-orphan")
    hints = relationship("Hint", back_populates="task", cascade="all, delete-orphan")
    test_tasks = relationship("TestTask", back_populates="task", cascade="all, delete-orphan")
    attempt_answers = relationship("AttemptAnswer", back_populates="task")


class TaskImage(Base):
    __tablename__ = "task_images"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    order_index = Column(Integer, default=0)

    # Relationships
    task = relationship("Task", back_populates="images")


class TaskOption(Base):
    __tablename__ = "task_options"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)
    order_index = Column(Integer, default=0)

    # Relationships
    task = relationship("Task", back_populates="options")


class TaskArticle(Base):
    __tablename__ = "task_articles"

    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True)

    # Relationships
    task = relationship("Task", back_populates="task_articles")
    article = relationship("Article", back_populates="task_articles")


class Hint(Base):
    __tablename__ = "hints"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=True)
    tier = Column(Integer, nullable=False)  # 1=тема, 2=формула, 3=шаг решения
    cost = Column(Integer, nullable=False, default=0)
    content = Column(Text, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="hints")
    topic = relationship("Topic", back_populates="hints")


class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    time_limit_sec = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    creator = relationship("User", back_populates="tests_created", foreign_keys=[created_by])
    test_tasks = relationship("TestTask", back_populates="test", cascade="all, delete-orphan", order_by="TestTask.order_index")
    attempts = relationship("Attempt", back_populates="test")


class TestTask(Base):
    __tablename__ = "test_tasks"

    test_id = Column(Integer, ForeignKey("tests.id", ondelete="CASCADE"), primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True)
    order_index = Column(Integer, default=0)

    # Relationships
    test = relationship("Test", back_populates="test_tasks")
    task = relationship("Task", back_populates="test_tasks")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mode = Column(SQLEnum(AttemptMode), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    score = Column(Integer, default=0)
    max_score = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="attempts")
    test = relationship("Test", back_populates="attempts")
    answers = relationship("AttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class AttemptAnswer(Base):
    __tablename__ = "attempt_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    chosen_option_id = Column(Integer, ForeignKey("task_options.id"), nullable=True)
    given_text = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    points_earned = Column(Integer, nullable=False, default=0)
    hints_used = Column(JSON, nullable=True, default=list)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attempt = relationship("Attempt", back_populates="answers")
    task = relationship("Task", back_populates="attempt_answers")
    chosen_option = relationship("TaskOption")
