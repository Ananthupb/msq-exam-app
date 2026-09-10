from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database.session import get_db
from ..models.schema import Question, User
from ..schemas.dto import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    BulkDeleteQuestionsRequest,
    ParseTextRequest,
    ParseQuestionsResponse,
    GenerateTopicRequest,
    GenerateTopicResponse,
)
from ..parsers.doc_parser import DocumentQuestionParser
from ..parsers.topic_generator import TopicQuestionGenerator
from ..core.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/questions", tags=["Questions"])
parser = DocumentQuestionParser()
topic_generator = TopicQuestionGenerator()


@router.post("/generate-topic", response_model=GenerateTopicResponse)
def generate_questions_by_topic(
    payload: GenerateTopicRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generates Multiple Select Questions (MSQ) based on a topic (e.g., Computer Networking,
    Cybersecurity, Operating Systems, Banking, Mathematics). Works completely independently
    of admin questions.
    """
    questions = topic_generator.generate_by_topic(payload.topic, payload.count)
    return GenerateTopicResponse(
        topic=payload.topic,
        total_generated=len(questions),
        questions=questions,
        message=f"Generated {len(questions)} questions for topic '{payload.topic}'."
    )


@router.post("/parse", response_model=ParseQuestionsResponse)
def parse_raw_text(payload: ParseTextRequest):
    """
    Parses raw text directly into MSQ/MCQ questions.
    """
    questions = parser.generate_questions(payload.text)
    return ParseQuestionsResponse(
        total_parsed=len(questions),
        questions=questions,
        warnings=[] if questions else ["No structured questions detected in the provided text."]
    )



@router.get("", response_model=List[QuestionResponse])
def get_questions(
    search: str = Query(default="", description="Search within question text"),
    scope: str = Query(default="auto", description="Scope: auto, personal, admin, or all"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    List questions with role-based scoping:
    - Normal students: only see their own personal questions (owner_id == current_user.id).
    - Admins: see admin bank by default, or personal/all if requested.
    - Unauthenticated: see public/admin questions.
    """
    query = db.query(Question)

    if current_user and current_user.role == "user":
        # Normal user only sees their own questions
        query = query.filter(Question.owner_id == current_user.id)
    elif current_user and current_user.role == "admin":
        if scope == "personal":
            query = query.filter(Question.owner_id == current_user.id)
        elif scope == "all":
            pass  # return all
        else:  # "admin" or "auto"
            query = query.filter(
                or_(Question.owner_id == None, Question.source_type == "admin")
            )
    else:
        # Unauthenticated fallback to global admin questions
        query = query.filter(
            or_(Question.owner_id == None, Question.source_type == "admin")
        )

    if search.strip():
        query = query.filter(Question.question_text.ilike(f"%{search.strip()}%"))

    return query.order_by(Question.id.desc()).all()


@router.post("", response_model=List[QuestionResponse])
def create_questions(
    payload: Union[QuestionCreate, List[QuestionCreate]],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates one or multiple questions in the question bank.
    - Students: automatically tagged with owner_id = current_user.id, source_type = user_upload / manual.
    - Admins: tagged with owner_id = None or specified, source_type = admin.
    """
    items = payload if isinstance(payload, list) else [payload]
    created = []

    is_admin = current_user.role == "admin"

    for item in items:
        num_opts = len(item.options)
        valid_labels = [chr(ord('A') + i) for i in range(num_opts)]
        for ans in item.correct_answers:
            if ans.upper() not in valid_labels:
                raise HTTPException(
                    status_code=400,
                    detail=f"Correct answer '{ans}' is invalid. Options are {', '.join(valid_labels)}."
                )

        owner_id = item.owner_id if (is_admin and item.owner_id is not None) else current_user.id
        source_type = item.source_type or ("admin" if is_admin else "user_upload")
        source_filename = item.source_filename or item.source_file

        q = Question(
            owner_id=owner_id,
            source_type=source_type,
            source_filename=source_filename,
            question_text=item.question_text.strip(),
            question_type=item.question_type or ("MSQ" if len(item.correct_answers) > 1 else "MCQ"),
            options=[opt.strip() for opt in item.options],
            correct_answers=[ans.upper() for ans in item.correct_answers],
            explanation=item.explanation.strip() if item.explanation else None,
            source_file=source_filename
        )
        db.add(q)
        created.append(q)

    db.commit()
    for q in created:
        db.refresh(q)

    return created


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing question.
    Students can only edit their own questions. Admins can edit any question.
    """
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    if current_user.role != "admin" and q.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this question.")

    if payload.question_text is not None:
        q.question_text = payload.question_text.strip()
    if payload.question_type is not None:
        q.question_type = payload.question_type
    if payload.options is not None:
        q.options = [opt.strip() for opt in payload.options]
    if payload.correct_answers is not None:
        num_opts = len(q.options)
        valid_labels = [chr(ord('A') + i) for i in range(num_opts)]
        for ans in payload.correct_answers:
            if ans.upper() not in valid_labels:
                raise HTTPException(
                    status_code=400,
                    detail=f"Correct answer '{ans}' is invalid for options {', '.join(valid_labels)}."
                )
        q.correct_answers = [ans.upper() for ans in payload.correct_answers]
    if payload.explanation is not None:
        q.explanation = payload.explanation.strip() if payload.explanation else None

    db.commit()
    db.refresh(q)
    return q


@router.delete("/all")
def delete_all_questions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes all questions within the user's scope:
    - Student: Deletes ALL their own personal questions.
    - Admin: Deletes all admin questions.
    Preserves exam attempts and history.
    """
    if current_user.role == "admin":
        questions = db.query(Question).filter(
            or_(Question.owner_id == None, Question.source_type == "admin")
        ).all()
    else:
        questions = db.query(Question).filter(Question.owner_id == current_user.id).all()

    count = len(questions)
    for q in questions:
        db.delete(q)
    db.commit()
    return {
        "status": "success",
        "deleted_count": count,
        "message": f"Successfully deleted {count} questions."
    }


@router.delete("/bulk")
def delete_questions_bulk(
    payload: BulkDeleteQuestionsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes multiple selected questions by ID.
    - Students can only delete questions they own.
    - Admins can delete any specified questions.
    """
    query = db.query(Question).filter(Question.id.in_(payload.question_ids))
    if current_user.role != "admin":
        query = query.filter(Question.owner_id == current_user.id)

    questions = query.all()
    count = len(questions)
    for q in questions:
        db.delete(q)
    db.commit()
    return {
        "status": "success",
        "deleted_count": count,
        "message": f"{count} question{'s' if count != 1 else ''} deleted successfully."
    }


@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a single question by ID.
    Enforces user ownership for students.
    """
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    if current_user.role != "admin" and q.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this question.")

    db.delete(q)
    db.commit()
    return {"status": "success", "message": f"Question {question_id} deleted."}
