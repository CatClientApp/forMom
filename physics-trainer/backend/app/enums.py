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
