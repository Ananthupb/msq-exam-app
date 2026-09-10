from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from ..database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)  # "user" or "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    attempts = relationship("ExamAttempt", back_populates="user", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="owner", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="owner", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    source_type = Column(String(50), default="admin", nullable=False)  # "admin", "user_upload", "manual"
    source_filename = Column(String(255), nullable=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(20), default="MSQ", nullable=False)  # MSQ or MCQ
    options = Column(JSON, nullable=False)  # list of strings: ["Option 1", "Option 2", ...]
    correct_answers = Column(JSON, nullable=False)  # list of option identifiers: ["A", "B", ...]
    explanation = Column(Text, nullable=True)
    source_file = Column(String(255), nullable=True)  # alias for backwards compatibility
    created_at = Column(DateTime, default=utc_now, nullable=False)

    owner = relationship("User", back_populates="questions")
    exam_links = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    is_practice = Column(Boolean, default=False, nullable=False)
    title = Column(String(255), nullable=False)
    total_questions = Column(Integer, nullable=False)
    time_limit = Column(Integer, nullable=False)  # in minutes
    randomize_questions = Column(Boolean, default=False, nullable=False)
    randomize_options = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    owner = relationship("User", back_populates="exams")
    exam_questions = relationship(
        "ExamQuestion",
        back_populates="exam",
        cascade="all, delete-orphan",
        order_by="ExamQuestion.order_index"
    )
    attempts = relationship("ExamAttempt", back_populates="exam", cascade="all, delete-orphan")



class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    options_order = Column(JSON, nullable=True)

    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_links")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True)
    exam_title = Column(String(255), nullable=False)
    total_questions = Column(Integer, nullable=False)
    time_limit = Column(Integer, nullable=False)  # in minutes

    # Timer and lifecycle fields
    started_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="in_progress", nullable=False)  # in_progress, completed, auto_submitted, abandoned

    # Progress restoration fields
    current_question = Column(Integer, default=0, nullable=False)
    current_answers = Column(JSON, default=dict, nullable=False)  # { "question_id": ["A", "C"] }

    # Grading fields
    attempted = Column(Integer, default=0, nullable=False)
    correct = Column(Integer, default=0, nullable=False)
    wrong = Column(Integer, default=0, nullable=False)
    skipped = Column(Integer, default=0, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    percentage = Column(Float, default=0.0, nullable=False)
    time_taken = Column(Integer, default=0, nullable=False)  # in seconds
    answers_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="attempts")
    exam = relationship("Exam", back_populates="attempts")
