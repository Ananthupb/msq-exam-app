from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from ..services.document_service import DocumentService
from ..parsers.doc_parser import DocumentQuestionParser
from ..schemas.dto import UploadResponse
from ..models.schema import User
from ..core.deps import get_current_user

router = APIRouter(prefix="/api/upload", tags=["Upload"])

doc_service = DocumentService()
parser = DocumentQuestionParser()


@router.post("", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a PDF, DOCX, or DOC file, extracts text,
    and runs the question parser to extract questions and answers.
    Accessible to both students and administrators.
    """
    saved_path, original_filename, file_size = doc_service.validate_and_save(file)
    extracted_text = doc_service.extract_text(saved_path)
    parsed_questions = parser.generate_questions(extracted_text)

    if not parsed_questions:
        return UploadResponse(
            filename=original_filename,
            file_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            extracted_text_length=len(extracted_text),
            total_questions_detected=0,
            questions=[],
            is_study_notes_only=True,
            message=(
                "Document was uploaded and read successfully, but no pre-existing structured questions and answers "
                "were detected. It appears to contain study material or plain notes. Automatic question generation "
                "from raw notes requires an AI question-generation feature. In this local offline version, please upload "
                "documents containing questions and answer keys (e.g. '1. ...', 'A. ...', 'Answer: A, B') "
                "or create questions manually in your Question Bank."
            )
        )

    return UploadResponse(
        filename=original_filename,
        file_type=file.content_type or "application/octet-stream",
        file_size_bytes=file_size,
        extracted_text_length=len(extracted_text),
        total_questions_detected=len(parsed_questions),
        questions=parsed_questions,
        is_study_notes_only=False,
        message=f"Successfully extracted {len(parsed_questions)} questions from document."
    )

