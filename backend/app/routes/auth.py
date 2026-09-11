from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import jwt

from ..database.session import get_db
from ..models.schema import User, ExamAttempt
from ..schemas.dto import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    UserProfileStatsResponse,
)
from ..core.security import hash_password, verify_password, create_access_token, JWT_SECRET, JWT_ALGORITHM
from ..core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new student account.
    If this is the first user ever in the database, grant admin role.
    """
    # Check if username or email already taken
    existing_user = db.query(User).filter(
        (User.username == payload.username.strip()) | (User.email == payload.email.lower().strip())
    ).first()
    if existing_user:
        if existing_user.username == payload.username.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken. Please choose another."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered. Please log in."
            )

    # First user can be admin if no users exist
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "user"

    new_user = User(
        username=payload.username.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=new_user
    )


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates a user via Username or Email and issues a JWT token.
    """
    ident = payload.identifier.strip().lower()
    user = db.query(User).filter(
        (User.username.ilike(ident)) | (User.email.ilike(ident))
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Please contact administrator.",
        )

    expires = timedelta(days=30) if payload.remember_me else timedelta(days=7)
    token = create_access_token({"sub": str(user.id), "role": user.role}, expires_delta=expires)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile.
    """
    return current_user


@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user)):
    """
    Client-side session invalidation acknowledgment.
    """
    return {"status": "success", "message": "Successfully logged out."}


@router.post("/forgot-password")
def forgot_password_request(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiates password recovery by verifying user exists and providing a temporary reset token.
    Works seamlessly offline without requiring paid third-party SMTP services.
    """
    ident = payload.identifier.strip().lower()
    user = db.query(User).filter(
        (User.username.ilike(ident)) | (User.email.ilike(ident))
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with that username or email address."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Please contact an administrator."
        )

    # Issue 15-minute reset token
    reset_token = create_access_token(
        {"sub": str(user.id), "scope": "password_reset", "username": user.username},
        expires_delta=timedelta(minutes=15)
    )

    return {
        "status": "success",
        "message": f"Account verified for {user.username}. You may now reset your password.",
        "reset_token": reset_token,
        "username": user.username,
        "email": user.email
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Resets the user's password using either the reset token or verified identifier.
    """
    target_user: Optional[User] = None

    if payload.reset_token:
        try:
            decoded = jwt.decode(payload.reset_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = int(decoded.get("sub"))
            target_user = db.query(User).filter(User.id == user_id).first()
        except Exception:
            pass

    if not target_user:
        ident = payload.identifier.strip().lower()
        target_user = db.query(User).filter(
            (User.username.ilike(ident)) | (User.email.ilike(ident))
        ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found or reset session expired."
        )

    new_pwd = payload.new_password.strip()
    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    target_user.password_hash = hash_password(new_pwd)
    db.commit()

    return {
        "status": "success",
        "message": f"Password for {target_user.username} has been successfully reset. You can now sign in with your new password."
    }


@router.put("/change-password")
def change_own_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows authenticated users to change their own password by verifying current password.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    new_pwd = payload.new_password.strip()
    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    current_user.password_hash = hash_password(new_pwd)
    db.commit()

    return {
        "status": "success",
        "message": "Password changed successfully."
    }


@router.put("/profile", response_model=UserResponse)
def update_own_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows users to update their username or email address.
    """
    if payload.username is not None:
        clean_user = payload.username.strip()
        if clean_user != current_user.username:
            existing = db.query(User).filter(
                User.username.ilike(clean_user),
                User.id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This username is already taken."
                )
            current_user.username = clean_user

    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        if clean_email != current_user.email:
            existing = db.query(User).filter(
                User.email.ilike(clean_email),
                User.id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email address is already in use by another account."
                )
            current_user.email = clean_email

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/profile/stats", response_model=UserProfileStatsResponse)
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns exam participation statistics for the current user.
    """
    total = db.query(ExamAttempt).filter(ExamAttempt.user_id == current_user.id).count()
    completed = db.query(ExamAttempt).filter(
        ExamAttempt.user_id == current_user.id,
        ExamAttempt.status.in_(["completed", "auto_submitted"])
    ).count()

    avg_score_res = db.query(func.avg(ExamAttempt.percentage)).filter(
        ExamAttempt.user_id == current_user.id,
        ExamAttempt.status.in_(["completed", "auto_submitted"])
    ).scalar()

    avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    return UserProfileStatsResponse(
        total_attempts=total,
        completed_attempts=completed,
        average_score=avg_score
    )

