import os
import io
import docx
from fastapi.testclient import TestClient
from app.main import app
from tests.conftest import make_test_user

client = TestClient(app)


def test_user_upload_and_notes_detection():
    """
    Verifies that a normal user can upload documents and that unstructured study notes
    gracefully return an informational message about AI requirement without failing.
    """
    _, token = make_test_user("student_uploader", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload structured document with questions
    sample_pdf_path = os.path.join(os.path.dirname(__file__), "../../samples/sample_exam.pdf")
    sample_pdf_path = os.path.abspath(sample_pdf_path)
    assert os.path.exists(sample_pdf_path)

    with open(sample_pdf_path, "rb") as f:
        res = client.post(
            "/api/upload",
            headers=headers,
            files={"file": ("sample_exam.pdf", f, "application/pdf")}
        )
    assert res.status_code == 200
    data = res.json()
    assert data["total_questions_detected"] >= 5
    assert data["is_study_notes_only"] is False

    # 2. Upload plain study material / notes with no questions
    doc = docx.Document()
    doc.add_heading("Operating Systems Lecture Notes", level=1)
    doc.add_paragraph("An operating system acts as an intermediary between the user and the computer hardware.")
    doc.add_paragraph("Major components include Process Management, Memory Management, and File System Storage.")
    doc_io = io.BytesIO()
    doc.save(doc_io)
    doc_io.seek(0)

    res_notes = client.post(
        "/api/upload",
        headers=headers,
        files={"file": ("os_lecture_notes.docx", doc_io, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert res_notes.status_code == 200
    notes_data = res_notes.json()
    assert notes_data["total_questions_detected"] == 0
    assert notes_data["is_study_notes_only"] is True
    assert "AI question-generation feature" in notes_data["message"]


def test_question_bank_user_isolation():
    """
    Verifies that User A's questions are isolated from User B:
    - User A cannot see User B's questions
    - User B cannot edit or delete User A's questions
    """
    user_a, token_a = make_test_user("user_alice", role="user")
    user_b, token_b = make_test_user("user_bob", role="user")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a question
    payload_a = [
        {
            "question_text": "Alice's Private Biology Question?",
            "question_type": "MSQ",
            "options": ["Mitochondria", "Ribosome", "Chloroplast", "Golgi"],
            "correct_answers": ["A", "C"],
            "source_type": "user_upload",
            "source_filename": "biology.pdf",
        }
    ]
    res_create = client.post("/api/questions", json=payload_a, headers=headers_a)
    assert res_create.status_code == 200
    created_q = res_create.json()[0]
    q_id = created_q["id"]

    # User A views their questions
    res_get_a = client.get("/api/questions", headers=headers_a)
    assert res_get_a.status_code == 200
    questions_a = res_get_a.json()
    assert any(q["id"] == q_id for q in questions_a)

    # User B views their questions -> Alice's question must NOT appear!
    res_get_b = client.get("/api/questions", headers=headers_b)
    assert res_get_b.status_code == 200
    questions_b = res_get_b.json()
    assert not any(q["id"] == q_id for q in questions_b)

    # User B attempts to edit Alice's question -> 403 Forbidden
    res_edit_b = client.put(
        f"/api/questions/{q_id}",
        json={"question_text": "Hacked by Bob"},
        headers=headers_b
    )
    assert res_edit_b.status_code == 403

    # User B attempts to delete Alice's question -> 403 Forbidden
    res_del_b = client.delete(f"/api/questions/{q_id}", headers=headers_b)
    assert res_del_b.status_code == 403

    # Alice can delete her own question
    res_del_a = client.delete(f"/api/questions/{q_id}", headers=headers_a)
    assert res_del_a.status_code == 200


def test_personal_practice_exam_lifecycle():
    """
    Verifies that a student can create, list, and delete personal practice exams,
    and other students cannot see or delete them.
    """
    user_a, token_a = make_test_user("student_carol", role="user")
    user_b, token_b = make_test_user("student_dave", role="user")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates questions
    q_payload = [
        {
            "question_text": "Networking Question 1?",
            "question_type": "MSQ",
            "options": ["TCP", "UDP", "IP", "DNS"],
            "correct_answers": ["A", "B"],
        },
        {
            "question_text": "Networking Question 2?",
            "question_type": "MCQ",
            "options": ["IPv4", "IPv6", "Ethernet", "MAC"],
            "correct_answers": ["A"],
        },
    ]
    res_qs = client.post("/api/questions", json=q_payload, headers=headers_a)
    assert res_qs.status_code == 200
    q_ids = [q["id"] for q in res_qs.json()]

    # User A creates a personal practice exam
    exam_payload = {
        "title": "Carol's Personal Networking Practice Test",
        "question_ids": q_ids,
        "time_limit": 15,
        "randomize_questions": True,
        "randomize_options": True,
        "is_practice": True,
    }
    res_exam = client.post("/api/exams", json=exam_payload, headers=headers_a)
    assert res_exam.status_code == 200
    exam_data = res_exam.json()
    assert exam_data["is_practice"] is True
    assert exam_data["owner_id"] == user_a.id
    exam_id = exam_data["id"]

    # User A lists exams -> Carol sees her practice exam
    res_list_a = client.get("/api/exams", headers=headers_a)
    assert res_list_a.status_code == 200
    assert any(e["id"] == exam_id for e in res_list_a.json())

    # User B lists exams -> Dave MUST NOT see Carol's practice exam
    res_list_b = client.get("/api/exams", headers=headers_b)
    assert res_list_b.status_code == 200
    assert not any(e["id"] == exam_id for e in res_list_b.json())

    # User B attempts to delete Carol's practice exam -> 403 Forbidden
    res_del_b = client.delete(f"/api/exams/{exam_id}", headers=headers_b)
    assert res_del_b.status_code == 403

    # User A can delete her practice exam
    res_del_a = client.delete(f"/api/exams/{exam_id}", headers=headers_a)
    assert res_del_a.status_code == 200


def test_topic_based_practice_generation_and_zero_admin_dependency():
    """
    Verifies:
    1. A student can generate questions on any topic without any admin questions existing.
    2. The student can create and submit a personal practice test with 0 admin questions.
    """
    user, token = make_test_user("topic_student", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Generate questions by topic
    res_topic = client.post(
        "/api/questions/generate-topic",
        json={"topic": "Computer Networking", "count": 5},
        headers=headers
    )
    assert res_topic.status_code == 200
    topic_data = res_topic.json()
    assert topic_data["topic"] == "Computer Networking"
    assert len(topic_data["questions"]) >= 3
    for q in topic_data["questions"]:
        assert len(q["options"]) >= 2
        assert len(q["correct_answers"]) >= 1

    # 2. Save generated questions into the user's private question bank
    save_payload = [
        {
            "question_text": q["question"],
            "question_type": q["type"],
            "options": q["options"],
            "correct_answers": q["correct_answers"],
            "explanation": q.get("explanation"),
            "source_type": "user_upload",
            "source_filename": "topic_networking"
        }
        for q in topic_data["questions"]
    ]
    res_save = client.post("/api/questions", json=save_payload, headers=headers)
    assert res_save.status_code == 200
    saved_qs = res_save.json()
    assert len(saved_qs) == len(save_payload)
    q_ids = [q["id"] for q in saved_qs]

    # 3. Create personal practice test
    exam_payload = {
        "title": "Topic Practice: Computer Networking",
        "question_ids": q_ids,
        "time_limit": 20,
        "randomize_questions": True,
        "randomize_options": False,
        "is_practice": True
    }
    res_exam = client.post("/api/exams", json=exam_payload, headers=headers)
    assert res_exam.status_code == 200
    exam_info = res_exam.json()
    assert exam_info["is_practice"] is True

    # 4. Start and take exam
    res_start = client.post(f"/api/exams/{exam_info['id']}/start", headers=headers)
    assert res_start.status_code == 200
    start_info = res_start.json()
    assert start_info["status"] == "in_progress"

    # 5. Submit exam
    res_submit = client.post(
        f"/api/exams/{exam_info['id']}/submit",
        json={"attempt_id": start_info["attempt_id"], "answers": [], "time_taken": 30},
        headers=headers
    )
    assert res_submit.status_code == 200
    attempt = res_submit.json()
    assert attempt["status"] == "completed"


def test_topic_based_accuracy_no_cross_domain_leak():
    """
    Verifies that requesting 'bank exams' returns ONLY banking questions with ZERO
    cross-domain pollution (no OS threads, deadlocks, or networking questions).
    """
    user, token = make_test_user("bank_student", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/questions/generate-topic",
        json={"topic": "bank exams", "count": 10},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) == 10

    # Verify no OS or networking questions leaked
    forbidden_terms = ["thread", "deadlock", "paging", "kernel", "process vs", "osi model", "subnet"]
    for q in data["questions"]:
        q_text = q["question"].lower()
        for term in forbidden_terms:
            assert term not in q_text, f"Forbidden term '{term}' leaked into bank exams question: {q['question']}"
        assert len(q["options"]) == 4
        assert len(q["correct_answers"]) >= 1

    # Verify answers have varied counts (not all 3 answers)
    answer_lengths = [len(q["correct_answers"]) for q in data["questions"]]
    assert 1 in answer_lengths, "Expected some single-choice (MCQ) questions with 1 correct answer"


def test_topic_based_arbitrary_topic_synthesis():
    """
    Verifies that an unlisted or arbitrary topic (e.g. 'Microbiology') generates
    questions specifically tailored to that topic name.
    """
    user, token = make_test_user("micro_student", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/questions/generate-topic",
        json={"topic": "Microbiology and Immunology", "count": 5},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) == 5
    for q in data["questions"]:
        assert "microbiology and immunology" in q["question"].lower() or "microbiology" in q["question"].lower()


