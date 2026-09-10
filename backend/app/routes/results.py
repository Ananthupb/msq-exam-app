from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..models.schema import ExamAttempt, User
from ..schemas.dto import ExamAttemptResponse
from ..services.exam_service import ExamService
from ..core.deps import get_current_user_optional

router = APIRouter(prefix="/api/results", tags=["Results"])


@router.get("", response_model=List[ExamAttemptResponse])
def get_all_results(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns list of finalized exam attempts.
    If authenticated as normal user, returns only their own attempts.
    If authenticated as admin, returns all attempts.
    """
    query = db.query(ExamAttempt).filter(
        ExamAttempt.status.in_(["completed", "auto_submitted"])
    )

    if current_user:
        if current_user.role != "admin":
            query = query.filter(ExamAttempt.user_id == current_user.id)
    else:
        # For backwards compatibility with anonymous local testing
        query = query.filter(ExamAttempt.user_id.is_(None))

    attempts = query.order_by(ExamAttempt.created_at.desc()).all()

    result = []
    for a in attempts:
        item = ExamAttemptResponse.model_validate(a)
        if a.user:
            item.username = a.user.username
        result.append(item)
    return result


@router.get("/{attempt_id}", response_model=ExamAttemptResponse)
def get_result_detail(
    attempt_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns a specific exam attempt result with detailed question reviews.
    Enforces that non-admin users cannot access other users' results.
    """
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt result not found.")

    if current_user and current_user.role != "admin":
        if attempt.user_id and attempt.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own exam attempts."
            )

    item = ExamAttemptResponse.model_validate(attempt)
    if attempt.user:
        item.username = attempt.user.username
    return item


@router.delete("/{attempt_id}")
def delete_attempt(
    attempt_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Permanently deletes a student's attempt record.
    Enforces that non-admin users cannot delete other users' attempts.
    """
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found.")

    if current_user and current_user.role != "admin":
        if attempt.user_id and attempt.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only delete your own exam attempts."
            )

    ExamService.delete_attempt(db, attempt_id)
    return {"status": "success", "message": f"Attempt {attempt_id} deleted successfully."}
