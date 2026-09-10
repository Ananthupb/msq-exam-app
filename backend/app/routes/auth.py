from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..models.schema import User
from ..schemas.dto import UserRegister, UserLogin, UserResponse, TokenResponse
from ..core.security import hash_password, verify_password, create_access_token
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
