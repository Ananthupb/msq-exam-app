import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database.session import Base, engine, SessionLocal
from .models.schema import User
from .core.security import hash_password

from .routes import (
    upload_router,
    questions_router,
    exams_router,
    results_router,
    auth_router,
    admin_router,
)


def create_admin_from_env():
    """
    Create the initial admin account from environment variables.

    Required environment variables:
      ADMIN_USERNAME
      ADMIN_EMAIL
      ADMIN_PASSWORD

    If the admin already exists, nothing is changed.
    """

    username = os.getenv("ADMIN_USERNAME")
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")

    # Do nothing if admin setup variables are not configured
    if not username or not email or not password:
        return

    if len(username) < 3:
        print("ADMIN SETUP ERROR: username must be at least 3 characters.")
        return

    if "@" not in email:
        print("ADMIN SETUP ERROR: invalid email address.")
        return

    if len(password) < 6:
        print("ADMIN SETUP ERROR: password must be at least 6 characters.")
        return

    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()

        if existing_user:
            print(
                f"Admin setup skipped: user '{existing_user.username}' "
                "already exists."
            )
            return

        admin = User(
            username=username,
            email=email.lower(),
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print(f"Admin account '{username}' created successfully.")

    except Exception as exc:
        db.rollback()
        print(f"ADMIN SETUP ERROR: {exc}")

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables automatically
    Base.metadata.create_all(bind=engine)

    # Create initial admin if environment variables are configured
    create_admin_from_env()

    yield


app = FastAPI(
    title="MSQ Exam Application API",
    description="Backend API for Document Question Extraction and Multiple Select Question (MSQ) Exams",
    version="1.0.0",
    lifespan=lifespan
)


# CORS setup
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)

origins = [
    origin.strip()
    for origin in allowed_origins_env.split(",")
    if origin.strip()
]

if "*" not in origins:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global user-friendly exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "hint": "Please check your input or server logs."
        }
    )


# Include routers
app.include_router(upload_router)
app.include_router(questions_router)
app.include_router(exams_router)
app.include_router(results_router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/")
def root():
    return {
        "app": "MSQ Exam API",
        "status": "online",
        "documentation": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}