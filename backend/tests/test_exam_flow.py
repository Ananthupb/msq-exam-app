import pytest
from fastapi.testclient import TestClient
from app.main import app
from tests.conftest import make_test_user

client = TestClient(app)


def test_complete_exam_flow_with_lifecycle():
    _, admin_token = make_test_user("flow_admin", role="admin")
    _, student_token = make_test_user("flow_student", role="user")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_student = {"Authorization": f"Bearer {student_token}"}

    # 1. Add questions to bank (admin)
    questions_payload = [
        {
            "question_text": "Which of the following are cloud providers?",
            "question_type": "MSQ",
            "options": ["AWS", "Google Cloud", "Windows 11", "Microsoft Azure"],
            "correct_answers": ["A", "B", "D"],
            "explanation": "AWS, GCP, and Azure are cloud platforms."
        },
        {
            "question_text": "Which of the following are relational databases?",
            "question_type": "MSQ",
            "options": ["PostgreSQL", "Redis", "MySQL", "MongoDB"],
            "correct_answers": ["A", "C"],
            "explanation": "Postgres and MySQL are SQL RDBMS."
        }
    ]

    create_res = client.post("/api/questions", headers=headers_admin, json=questions_payload)
    assert create_res.status_code == 200
    created_qs = create_res.json()
    q1_id = created_qs[0]["id"]
    q2_id = created_qs[1]["id"]

    # 2. Create Exam (admin)
    exam_payload = {
        "title": "Cloud & DB Practice",
        "question_ids": [q1_id, q2_id],
        "time_limit": 10,
        "randomize_questions": False,
        "randomize_options": False
    }
    exam_res = client.post("/api/exams", headers=headers_admin, json=exam_payload)
    assert exam_res.status_code == 200
    exam_id = exam_res.json()["id"]

    # 3. Start Exam as student -> creates attempt linked to student
    start_res = client.post(f"/api/exams/{exam_id}/start", headers=headers_student)
    assert start_res.status_code == 200
    start_data = start_res.json()
    attempt_id = start_data["attempt_id"]
    assert start_data["status"] == "in_progress"
    assert start_data["remaining_seconds"] > 590
    assert len(start_data["questions"]) == 2

    # 4. Save Progress during exam
    save_payload = {
        "attempt_id": attempt_id,
        "current_question": 1,
        "answers": {
            str(q1_id): ["A", "B", "D"],
            str(q2_id): ["A"]
        }
    }
    save_res = client.post(f"/api/exams/{exam_id}/save-progress", json=save_payload)
    assert save_res.status_code == 200
    assert save_res.json()["status"] == "in_progress"
    assert not save_res.json()["is_expired"]

    # 5. Resume Exam (simulated page refresh) -> restores exact same attempt
    resume_res = client.post(f"/api/exams/{exam_id}/start", headers=headers_student)
    assert resume_res.status_code == 200
    resume_data = resume_res.json()
    assert resume_data["attempt_id"] == attempt_id
    assert resume_data["current_question"] == 1
    assert resume_data["current_answers"][str(q1_id)] == ["A", "B", "D"]

    # 6. Submit Exam
    submit_payload = {
        "attempt_id": attempt_id,
        "time_taken": 120,
        "answers": [
            {"question_id": q1_id, "selected_answers": ["A", "B", "D"]},
            {"question_id": q2_id, "selected_answers": ["A"]}
        ]
    }
    submit_res = client.post(f"/api/exams/{exam_id}/submit", headers=headers_student, json=submit_payload)
    assert submit_res.status_code == 200
    result = submit_res.json()
    assert result["score"] == 1.0
    assert result["percentage"] == 50.0
    assert result["status"] == "completed"

    # 7. Check student results history list
    history_res = client.get("/api/results", headers=headers_student)
    assert history_res.status_code == 200
    attempts_list = history_res.json()
    assert any(a["id"] == attempt_id for a in attempts_list)

    # 8. Delete Attempt (as student who owns it)
    del_attempt_res = client.delete(f"/api/results/{attempt_id}", headers=headers_student)
    assert del_attempt_res.status_code == 200

    # Verify attempt is gone
    check_del = client.get(f"/api/results/{attempt_id}", headers=headers_student)
    assert check_del.status_code == 404

    # Verify question bank and exam still exist
    q_check = client.get("/api/questions")
    assert len(q_check.json()) >= 2
    exam_check = client.get(f"/api/exams/{exam_id}")
    assert exam_check.status_code == 200

    # 9. Delete Exam (admin)
    del_exam_res = client.delete(f"/api/exams/{exam_id}", headers=headers_admin)
    assert del_exam_res.status_code == 200
    exam_check_after = client.get(f"/api/exams/{exam_id}")
    assert exam_check_after.status_code == 404

    # Verify question bank STILL exists
    q_check_after = client.get("/api/questions")
    assert len(q_check_after.json()) >= 2
