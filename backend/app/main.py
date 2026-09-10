import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database.session import Base, engine
from .routes import (
    upload_router,
    questions_router,
    exams_router,
    results_router,
    auth_router,
    admin_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables automatically on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="MSQ Exam Application API",
    description="Backend API for Document Question Extraction and Multiple Select Question (MSQ) Exams",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
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
