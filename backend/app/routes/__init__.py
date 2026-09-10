from .upload import router as upload_router
from .questions import router as questions_router
from .exams import router as exams_router
from .results import router as results_router
from .auth import router as auth_router
from .admin import router as admin_router

__all__ = [
    "upload_router",
    "questions_router",
    "exams_router",
    "results_router",
    "auth_router",
    "admin_router",
]
