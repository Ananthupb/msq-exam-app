from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database.session import get_db
from ..models.schema import User, Question, Exam, ExamAttempt
from ..schemas.dto import (
    AdminStatsResponse,
    AdminUserListItem,
    UserUpdate,
    AdminResetPasswordRequest,
    ExamAttemptResponse,
)
from ..core.deps import require_admin
from ..core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    """
    Returns global system statistics for the admin dashboard.
    """
    total_q = db.query(Question).count()
    total_e = db.query(Exam).count()
    total_u = db.query(User).count()
    total_a = db.query(ExamAttempt).filter(
        ExamAttempt.status.in_(["completed", "auto_submitted"])
    ).count()

    avg_score_res = db.query(func.avg(ExamAttempt.percentage)).filter(
        ExamAttempt.status.in_(["completed", "auto_submitted"])
    ).scalar()

    avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    return AdminStatsResponse(
        total_questions=total_q,
        total_exams=total_e,
        total_users=total_u,
        total_attempts=total_a,
        average_score=avg_score
    )


@router.get("/users", response_model=List[AdminUserListItem])
def list_all_users(db: Session = Depends(get_db)):
    """
    Lists all registered users along with their attempt counts.
    """
    users = db.query(User).order_by(User.id.desc()).all()
    results = []
    for u in users:
        attempt_count = db.query(ExamAttempt).filter(ExamAttempt.user_id == u.id).count()
        results.append(
            AdminUserListItem(
                id=u.id,
                username=u.username,
                email=u.email,
                role=u.role,
                is_active=u.is_active,
                created_at=u.created_at,
                total_attempts=attempt_count
            )
        )
    return results


@router.put("/users/{user_id}")
def update_user_status(
    user_id: int,
    payload: UserUpdate,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Updates role or activation status of a user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_admin.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    if payload.role is not None:
        if payload.role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'.")
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return {"status": "success", "message": f"User {user.username} updated."}


@router.put("/users/{user_id}/password")
def reset_user_password_admin(
    user_id: int,
    payload: AdminResetPasswordRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator endpoint to change/reset any user's password directly.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    pwd = payload.new_password.strip()
    if len(pwd) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    user.password_hash = hash_password(pwd)
    db.commit()
    return {"status": "success", "message": f"Password for user '{user.username}' has been successfully changed."}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deletes a user account.
    """
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.delete(user)
    db.commit()
    return {"status": "success", "message": f"User {user.username} deleted."}


@router.get("/attempts", response_model=List[ExamAttemptResponse])
def get_all_attempts_admin(db: Session = Depends(get_db)):
    """
    Returns all exam attempts across all students.
    """
    attempts = (
        db.query(ExamAttempt)
        .order_by(ExamAttempt.created_at.desc())
        .all()
    )

    result = []
    for a in attempts:
        item = ExamAttemptResponse.model_validate(a)
        if a.user:
            item.username = a.user.username
        result.append(item)
    return result
