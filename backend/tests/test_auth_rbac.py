import pytest
from fastapi.testclient import TestClient
from app.main import app
from tests.conftest import make_test_user

client = TestClient(app)


def test_auth_registration_and_login():
    # Register new student user
    res = client.post("/api/auth/register", json={
        "username": "reg_student",
        "email": "reg_student@example.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    student_data = res.json()
    assert student_data["user"]["username"] == "reg_student"
    assert "access_token" in student_data

    # Test Login with email
    login_res = client.post("/api/auth/login", json={
        "identifier": "reg_student@example.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    student_token = login_res.json()["access_token"]

    # Test Profile /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "reg_student"


def test_rbac_protection():
    _, admin_token = make_test_user("rbac_admin", role="admin")
    _, student_token = make_test_user("rbac_student", role="user")

    # 1. Normal student attempting to access admin stats -> 403 Forbidden
    res_forbidden = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {student_token}"})
    assert res_forbidden.status_code == 403

    # 2. Normal student attempting to access admin users -> 403 Forbidden
    res_users_forbidden = client.get("/api/admin/users", headers={"Authorization": f"Bearer {student_token}"})
    assert res_users_forbidden.status_code == 403

    # 3. Admin accessing admin stats -> 200 OK
    res_admin_ok = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin_ok.status_code == 200
    assert "total_questions" in res_admin_ok.json()

    # 4. Unauthenticated attempt to upload a file -> 401 Unauthorized
    res_upload_unauth = client.post(
        "/api/upload",
        files={"file": ("test.pdf", b"dummy content", "application/pdf")}
    )
    assert res_upload_unauth.status_code == 401



def test_bulk_delete_and_ownership():
    _, admin_token = make_test_user("bulk_admin", role="admin")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create 3 questions as admin
    q_res = client.post(
        "/api/questions",
        headers=admin_headers,
        json=[
            {
                "question_text": "Sample Q1 for bulk delete test?",
                "question_type": "MSQ",
                "options": ["A", "B", "C", "D"],
                "correct_answers": ["A", "B"]
            },
            {
                "question_text": "Sample Q2 for bulk delete test?",
                "question_type": "MSQ",
                "options": ["A", "B", "C", "D"],
                "correct_answers": ["B", "C"]
            },
            {
                "question_text": "Sample Q3 for bulk delete test?",
                "question_type": "MSQ",
                "options": ["A", "B", "C", "D"],
                "correct_answers": ["C", "D"]
            }
        ]
    )
    assert q_res.status_code == 200
    created = q_res.json()
    q_ids = [q["id"] for q in created]

    # Test Bulk Delete 2 questions
    bulk_del_res = client.request(
        "DELETE",
        "/api/questions/bulk",
        headers=admin_headers,
        json={"question_ids": [q_ids[0], q_ids[1]]}
    )
    assert bulk_del_res.status_code == 200
    assert bulk_del_res.json()["deleted_count"] == 2

    # Verify 1 remains
    remaining_q = client.get("/api/questions").json()
    remaining_ids = [q["id"] for q in remaining_q]
    assert q_ids[0] not in remaining_ids
    assert q_ids[1] not in remaining_ids
    assert q_ids[2] in remaining_ids

    # Test Delete All questions
    del_all_res = client.delete(
        "/api/questions/all",
        headers=admin_headers
    )
    assert del_all_res.status_code == 200
    assert len(client.get("/api/questions").json()) == 0
