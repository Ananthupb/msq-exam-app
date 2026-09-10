import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ..models.schema import Question, Exam, ExamQuestion, ExamAttempt, utc_now
from ..schemas.dto import (
    ExamCreate,
    ExamQuestionItem,
    ExamDetailResponse,
    ExamStartResponse,
    SaveProgressRequest,
    SaveProgressResponse,
    ExamSubmitRequest,
    QuestionReviewDetail,
    ExamAttemptResponse,
    AnswerSubmission,
)


class ExamService:
    @staticmethod
    def create_exam(
        db: Session,
        exam_in: ExamCreate,
        owner_id: Optional[int] = None,
        is_practice: bool = False
    ) -> Exam:
        """
        Creates an exam and links selected questions.
        Supports admin published exams and student personal practice tests.
        """
        if exam_in.question_ids:
            questions = db.query(Question).filter(Question.id.in_(exam_in.question_ids)).all()
        elif is_practice and owner_id:
            questions = db.query(Question).filter(Question.owner_id == owner_id).all()
        else:
            questions = db.query(Question).all()

        if not questions:
            raise HTTPException(
                status_code=400,
                detail="No questions available in the question bank to create an exam. Please upload or add questions first."
            )

        if exam_in.question_count and exam_in.question_count < len(questions):
            if exam_in.randomize_questions:
                selected_questions = random.sample(questions, exam_in.question_count)
            else:
                selected_questions = questions[:exam_in.question_count]
        else:
            selected_questions = list(questions)
            if exam_in.randomize_questions:
                random.shuffle(selected_questions)

        exam = Exam(
            owner_id=owner_id,
            is_practice=is_practice or exam_in.is_practice,
            title=exam_in.title,
            total_questions=len(selected_questions),
            time_limit=exam_in.time_limit,
            randomize_questions=exam_in.randomize_questions,
            randomize_options=exam_in.randomize_options,
        )
        db.add(exam)
        db.flush()


        for idx, q in enumerate(selected_questions):
            options_order = None
            if exam_in.randomize_options:
                indices = list(range(len(q.options)))
                random.shuffle(indices)
                options_order = indices

            link = ExamQuestion(
                exam_id=exam.id,
                question_id=q.id,
                order_index=idx,
                options_order=options_order
            )
            db.add(link)

        db.commit()
        db.refresh(exam)
        return exam

    @staticmethod
    def delete_exam(db: Session, exam_id: int) -> bool:
        """
        Permanently deletes an exam and its attempt history.
        Does not delete questions from the question bank.
        """
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found.")
        db.delete(exam)
        db.commit()
        return True

    @staticmethod
    def delete_attempt(db: Session, attempt_id: int) -> bool:
        """
        Permanently deletes a student's attempt record without affecting the exam or questions.
        """
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Exam attempt not found.")
        db.delete(attempt)
        db.commit()
        return True

    @staticmethod
    def get_exam_questions_formatted(db: Session, exam: Exam) -> List[ExamQuestionItem]:
        """
        Retrieves exam questions formatted for the candidate (correct answers omitted).
        """
        exam_questions = (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == exam.id)
            .order_by(ExamQuestion.order_index)
            .all()
        )

        formatted: List[ExamQuestionItem] = []
        for eq in exam_questions:
            q = eq.question
            options = list(q.options)
            if eq.options_order:
                options = [q.options[i] for i in eq.options_order]

            option_labels = [chr(ord('A') + i) for i in range(len(options))]

            formatted.append(
                ExamQuestionItem(
                    id=eq.id,
                    question_id=q.id,
                    question_text=q.question_text,
                    question_type=q.question_type,
                    options=options,
                    option_labels=option_labels
                )
            )
        return formatted

    @staticmethod
    def start_or_resume_exam(db: Session, exam_id: int, user_id: Optional[int] = None) -> ExamStartResponse:
        """
        Starts a new attempt or resumes an active in_progress attempt for the user.
        Calculates secure remaining time server-side.
        """
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found.")

        now = datetime.now(timezone.utc)

        # Look for existing active attempt for this specific user (or anonymous)
        query = db.query(ExamAttempt).filter(
            ExamAttempt.exam_id == exam.id,
            ExamAttempt.status == "in_progress"
        )
        if user_id is not None:
            query = query.filter(ExamAttempt.user_id == user_id)

        attempt = query.order_by(ExamAttempt.id.desc()).first()

        if attempt:
            # Check if expired
            expires_at = attempt.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if now >= expires_at:
                ExamService._finalize_attempt(db, exam, attempt, status="auto_submitted")
                remaining_sec = 0
            else:
                remaining_sec = max(0, int((expires_at - now).total_seconds()))
        else:
            expires_at = now + timedelta(minutes=exam.time_limit)
            attempt = ExamAttempt(
                user_id=user_id,
                exam_id=exam.id,
                exam_title=exam.title,
                total_questions=exam.total_questions,
                time_limit=exam.time_limit,
                started_at=now,
                expires_at=expires_at,
                status="in_progress",
                current_question=0,
                current_answers={},
                score=0.0,
                percentage=0.0,
                attempted=0,
                correct=0,
                wrong=0,
                skipped=exam.total_questions,
                time_taken=0,
                answers_summary=None
            )
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            remaining_sec = exam.time_limit * 60

        questions = ExamService.get_exam_questions_formatted(db, exam)

        return ExamStartResponse(
            attempt_id=attempt.id,
            exam_id=exam.id,
            exam_title=exam.title,
            total_questions=exam.total_questions,
            time_limit=exam.time_limit,
            started_at=attempt.started_at,
            expires_at=attempt.expires_at,
            remaining_seconds=remaining_sec,
            status=attempt.status,
            current_question=attempt.current_question,
            current_answers=attempt.current_answers or {},
            questions=questions
        )

    @staticmethod
    def save_progress(db: Session, exam_id: int, payload: SaveProgressRequest) -> SaveProgressResponse:
        """
        Saves selected answers and active question index during examination.
        Validates timer server-side.
        """
        attempt = db.query(ExamAttempt).filter(ExamAttempt.id == payload.attempt_id).first()
        if not attempt:
            raise HTTPException(status_code=404, detail="Exam attempt not found.")

        now = datetime.now(timezone.utc)
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now >= expires_at or attempt.status != "in_progress":
            if attempt.status == "in_progress":
                exam = db.query(Exam).filter(Exam.id == exam_id).first()
                if exam:
                    ExamService._finalize_attempt(db, exam, attempt, status="auto_submitted")
            return SaveProgressResponse(
                status=attempt.status,
                remaining_seconds=0,
                is_expired=True
            )

        attempt.current_question = payload.current_question
        attempt.current_answers = payload.answers
        db.commit()

        remaining_sec = max(0, int((expires_at - now).total_seconds()))
        return SaveProgressResponse(
            status="in_progress",
            remaining_seconds=remaining_sec,
            is_expired=False
        )

    @staticmethod
    def grade_exam(
        db: Session,
        exam_id: int,
        submission: ExamSubmitRequest,
        user_id: Optional[int] = None
    ) -> ExamAttempt:
        """
        Grades submitted answers and records/updates the ExamAttempt.
        """
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found.")

        attempt = None
        if submission.attempt_id:
            attempt = db.query(ExamAttempt).filter(ExamAttempt.id == submission.attempt_id).first()

        now = datetime.now(timezone.utc)

        # Convert submitted list to mapping: { question_id: ["A", "C"] }
        submitted_map: Dict[int, List[str]] = {}
        for ans in submission.answers:
            submitted_map[ans.question_id] = ans.selected_answers

        # If attempt was not provided, create a blank one
        if not attempt:
            attempt = ExamAttempt(
                user_id=user_id,
                exam_id=exam.id,
                exam_title=exam.title,
                total_questions=exam.total_questions,
                time_limit=exam.time_limit,
                started_at=now - timedelta(seconds=submission.time_taken or 60),
                expires_at=now,
                status="in_progress",
                current_question=0,
                current_answers={}
            )
            db.add(attempt)
            db.flush()
        elif user_id and not attempt.user_id:
            attempt.user_id = user_id

        # Update saved answers
        attempt.current_answers = {str(k): v for k, v in submitted_map.items()}

        # Determine status: check if submitted after expiration
        expires_at = attempt.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        status = "auto_submitted" if now > expires_at + timedelta(seconds=5) else "completed"

        # Calculate time taken
        started_at = attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)

        if submission.time_taken is not None:
            time_taken = submission.time_taken
        else:
            time_taken = min(int((now - started_at).total_seconds()), exam.time_limit * 60)

        attempt.time_taken = max(1, time_taken)

        return ExamService._finalize_attempt(db, exam, attempt, status=status)

    @staticmethod
    def _finalize_attempt(db: Session, exam: Exam, attempt: ExamAttempt, status: str) -> ExamAttempt:
        """
        Internal helper to grade answers and finalize ExamAttempt.
        """
        exam_questions = (
            db.query(ExamQuestion)
            .filter(ExamQuestion.exam_id == exam.id)
            .order_by(ExamQuestion.order_index)
            .all()
        )

        submitted_answers = attempt.current_answers or {}
        # Keys can be strings or ints in JSON
        norm_answers: Dict[int, set] = {}
        for k, v in submitted_answers.items():
            try:
                norm_answers[int(k)] = set(v)
            except (ValueError, TypeError):
                pass

        total = len(exam_questions)
        attempted = 0
        correct = 0
        wrong = 0
        skipped = 0
        review_details: List[Dict[str, Any]] = []

        for eq in exam_questions:
            q = eq.question
            user_picks = norm_answers.get(q.id, set())

            options = list(q.options)
            correct_set = set(q.correct_answers)

            if eq.options_order:
                display_options = [q.options[i] for i in eq.options_order]
                mapped_correct_set = set()
                for orig_letter in correct_set:
                    orig_idx = ord(orig_letter.upper()) - ord('A')
                    if orig_idx in eq.options_order:
                        disp_idx = eq.options_order.index(orig_idx)
                        mapped_correct_set.add(chr(ord('A') + disp_idx))

                options = display_options
                correct_set = mapped_correct_set

            option_labels = [chr(ord('A') + i) for i in range(len(options))]

            is_attempted = len(user_picks) > 0
            if is_attempted:
                attempted += 1

            # Exact match for MSQ
            is_correct = is_attempted and (user_picks == correct_set)

            if not is_attempted:
                q_status = "SKIPPED"
                skipped += 1
            elif is_correct:
                q_status = "CORRECT"
                correct += 1
            else:
                q_status = "WRONG"
                wrong += 1

            review_details.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": options,
                "option_labels": option_labels,
                "selected_answers": sorted(list(user_picks)),
                "correct_answers": sorted(list(correct_set)),
                "is_correct": is_correct,
                "is_attempted": is_attempted,
                "status": q_status,
                "explanation": q.explanation
            })

        score = float(correct)
        percentage = round((score / total) * 100.0, 1) if total > 0 else 0.0

        attempt.attempted = attempted
        attempt.correct = correct
        attempt.wrong = wrong
        attempt.skipped = skipped
        attempt.score = score
        attempt.percentage = percentage
        attempt.status = status
        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.answers_summary = review_details

        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def get_exam_detail(db: Session, exam_id: int) -> ExamDetailResponse:
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found.")

        questions = ExamService.get_exam_questions_formatted(db, exam)

        return ExamDetailResponse(
            id=exam.id,
            title=exam.title,
            total_questions=exam.total_questions,
            time_limit=exam.time_limit,
            randomize_questions=exam.randomize_questions,
            randomize_options=exam.randomize_options,
            created_at=exam.created_at,
            questions=questions
        )
