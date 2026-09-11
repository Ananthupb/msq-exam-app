from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# --- User & Auth Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    identifier: str = Field(..., description="Username or Email")
    password: str = Field(...)
    remember_me: bool = False


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100, description="New password for the user")


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Username or Email address")


class ResetPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Username or Email address")
    new_password: str = Field(..., min_length=6, max_length=100, description="New password")
    reset_token: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, max_length=100, description="New password")


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: Optional[str] = Field(default=None, min_length=5, max_length=255)


class UserProfileStatsResponse(BaseModel):
    total_attempts: int
    completed_attempts: int
    average_score: float


class AdminUserListItem(UserResponse):
    total_attempts: int = 0


class AdminStatsResponse(BaseModel):
    total_questions: int
    total_exams: int
    total_users: int
    total_attempts: int
    average_score: float


# --- Question Schemas ---
class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=3, description="Text of the question")
    question_type: str = Field(default="MSQ", description="Type of question: MSQ or MCQ")
    options: List[str] = Field(..., min_length=2, description="List of option texts")
    correct_answers: List[str] = Field(..., min_length=1, description="List of correct option labels, e.g. ['A', 'B']")
    explanation: Optional[str] = Field(default=None, description="Explanation for the correct answer")
    source_file: Optional[str] = Field(default=None, description="Original filename if extracted")
    source_filename: Optional[str] = Field(default=None, description="Original filename")
    source_type: str = Field(default="admin", description="Source type: admin, user_upload, or manual")
    owner_id: Optional[int] = Field(default=None, description="User ID of the owner, or null for admin")


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answers: Optional[List[str]] = None
    explanation: Optional[str] = None


class QuestionResponse(QuestionBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BulkDeleteQuestionsRequest(BaseModel):
    question_ids: List[int] = Field(..., min_length=1, description="List of question IDs to delete")


# --- Parsing Schemas ---
class ParsedQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answers: List[str]
    explanation: Optional[str] = None
    type: str = "MSQ"


class ParseTextRequest(BaseModel):
    text: str


class ParseQuestionsResponse(BaseModel):
    total_parsed: int
    questions: List[ParsedQuestion]
    warnings: List[str] = []


class GenerateTopicRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=150, description="Subject or topic name")
    count: int = Field(default=10, ge=1, le=50, description="Number of questions to generate")


class GenerateTopicResponse(BaseModel):
    topic: str
    total_generated: int
    questions: List[ParsedQuestion]
    message: Optional[str] = None



class UploadResponse(BaseModel):
    filename: str
    file_type: str
    file_size_bytes: int
    extracted_text_length: int
    total_questions_detected: int
    questions: List[ParsedQuestion]
    is_study_notes_only: bool = False
    message: Optional[str] = None


# --- Exam Schemas ---
class ExamCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    question_ids: Optional[List[int]] = Field(default=None, description="Specific question IDs to include")
    question_count: Optional[int] = Field(default=None, description="Number of questions to pick if question_ids not specified")
    time_limit: int = Field(default=20, ge=1, le=300, description="Time limit in minutes")
    randomize_questions: bool = Field(default=False)
    randomize_options: bool = Field(default=False)
    is_practice: bool = Field(default=False, description="Whether this is a personal practice test")


class ExamQuestionItem(BaseModel):
    id: int
    question_id: int
    question_text: str
    question_type: str
    options: List[str]
    option_labels: List[str]


class ExamResponse(BaseModel):
    id: int
    owner_id: Optional[int] = None
    is_practice: bool = False
    title: str
    total_questions: int
    time_limit: int
    randomize_questions: bool
    randomize_options: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ExamDetailResponse(ExamResponse):
    questions: List[ExamQuestionItem]



# --- Exam Session & Lifecycle Schemas ---
class ExamStartResponse(BaseModel):
    attempt_id: int
    exam_id: int
    exam_title: str
    total_questions: int
    time_limit: int
    started_at: datetime
    expires_at: datetime
    remaining_seconds: int
    status: str
    current_question: int
    current_answers: Dict[str, List[str]]
    questions: List[ExamQuestionItem]
    model_config = ConfigDict(from_attributes=True)


class SaveProgressRequest(BaseModel):
    attempt_id: int
    current_question: int
    answers: Dict[str, List[str]]


class SaveProgressResponse(BaseModel):
    status: str
    remaining_seconds: int
    is_expired: bool


# --- Exam Submission Schemas ---
class AnswerSubmission(BaseModel):
    question_id: int
    selected_answers: List[str] = []


class ExamSubmitRequest(BaseModel):
    attempt_id: Optional[int] = None
    time_taken: Optional[int] = None
    answers: List[AnswerSubmission]


class QuestionReviewDetail(BaseModel):
    question_id: int
    question_text: str
    question_type: str
    options: List[str]
    option_labels: List[str]
    selected_answers: List[str]
    correct_answers: List[str]
    is_correct: bool
    is_attempted: bool
    status: str  # "CORRECT", "WRONG", "SKIPPED"
    explanation: Optional[str] = None


class ExamAttemptResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    exam_id: Optional[int] = None
    exam_title: str
    total_questions: int
    time_limit: int
    started_at: datetime
    expires_at: datetime
    submitted_at: Optional[datetime] = None
    status: str
    current_question: int
    current_answers: Dict[str, Any]
    attempted: int
    correct: int
    wrong: int
    skipped: int
    score: float
    percentage: float
    time_taken: int
    created_at: datetime
    answers_summary: Optional[List[QuestionReviewDetail]] = None
    model_config = ConfigDict(from_attributes=True)
