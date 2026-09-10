from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database.session import get_db
from ..models.schema import Exam, User
from ..schemas.dto import (
    ExamCreate,
    ExamResponse,
    ExamDetailResponse,
    ExamStartResponse,
    SaveProgressRequest,
    SaveProgressResponse,
    ExamSubmitRequest,
    ExamAttemptResponse,
)
from ..services.exam_service import ExamService
from ..core.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/exams", tags=["Exams"])


@router.post("", response_model=ExamResponse)
def create_exam(
    payload: ExamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates an exam session or student practice test:
    - Normal students: automatically created as a personal practice test (is_practice=True, owner_id=current_user.id).
    - Admins: can create standard published exams or practice tests.
    """
    is_student = current_user.role != "admin"
    is_practice = True if is_student else payload.is_practice
    owner_id = current_user.id if (is_student or is_practice) else None

    exam = ExamService.create_exam(
        db=db,
        exam_in=payload,
        owner_id=owner_id,
        is_practice=is_practice
    )
    return exam


@router.get("", response_model=List[ExamResponse])
def list_exams(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Lists exams based on access level:
    - Normal students: Published system exams + their own personal practice tests.
    - Admins: All exams.
    - Public: Published system exams.
    """
    query = db.query(Exam)

    if current_user and current_user.role == "user":
        query = query.filter(
            or_(
                Exam.is_practice == False,
                Exam.owner_id == None,
                Exam.owner_id == current_user.id
            )
        )
    elif current_user and current_user.role == "admin":
        pass  # admins see all
    else:
        query = query.filter(
            or_(Exam.is_practice == False, Exam.owner_id == None)
        )

    return query.order_by(Exam.id.desc()).all()


@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    """
    Returns exam configuration and question stems.
    """
    return ExamService.get_exam_detail(db, exam_id)


@router.post("/{exam_id}/start", response_model=ExamStartResponse)
def start_or_resume_exam(
    exam_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Starts a new attempt or resumes an active in_progress attempt.
    Tracks user ownership if authenticated.
    """
    user_id = current_user.id if current_user else None
    return ExamService.start_or_resume_exam(db, exam_id, user_id=user_id)


@router.post("/{exam_id}/save-progress", response_model=SaveProgressResponse)
def save_exam_progress(
    exam_id: int,
    payload: SaveProgressRequest,
    db: Session = Depends(get_db)
):
    """
    Persists selected answers and current question during exam.
    Validates timer server-side.
    """
    return ExamService.save_progress(db, exam_id, payload)


@router.post("/{exam_id}/submit", response_model=ExamAttemptResponse)
def submit_exam(
    exam_id: int,
    submission: ExamSubmitRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Grades submitted answers, marks attempt as completed or auto_submitted,
    and returns full analytics and review.
    """
    user_id = current_user.id if current_user else None
    attempt = ExamService.grade_exam(db, exam_id, submission, user_id=user_id)
    return attempt


@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes an exam configuration.
    Students can only delete their own practice tests. Admins can delete any exam.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if current_user.role != "admin" and exam.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this exam.")

    ExamService.delete_exam(db, exam_id)
    return {"status": "success", "message": f"Exam {exam_id} deleted successfully."}

