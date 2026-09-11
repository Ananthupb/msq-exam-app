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


def test_admin_reset_user_password():
    """
    Verifies that an admin can reset any user's password directly,
    while non-admins are forbidden.
    """
    admin_user, admin_token = make_test_user("pw_admin", role="admin")
    student, student_token = make_test_user("pw_student", role="user")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Non-admin attempts to reset password -> 403 Forbidden
    res_forbidden = client.put(
        f"/api/admin/users/{student.id}/password",
        json={"new_password": "NewSecretPassword123!"},
        headers=student_headers
    )
    assert res_forbidden.status_code == 403

    # 2. Admin resets student password
    res_reset = client.put(
        f"/api/admin/users/{student.id}/password",
        json={"new_password": "NewSecretPassword123!"},
        headers=admin_headers
    )
    assert res_reset.status_code == 200
    assert "successfully changed" in res_reset.json()["message"]

    # 3. Student logs in with the new password
    login_res = client.post(
        "/api/auth/login",
        json={"identifier": student.username, "password": "NewSecretPassword123!"}
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_forgot_password_and_reset_flow():
    """
    Verifies the offline-friendly Forgot Password & Reset Password workflow.
    """
    user, _ = make_test_user("forgot_user", role="user")

    # 1. Request forgot password with username
    res_forgot = client.post(
        "/api/auth/forgot-password",
        json={"identifier": user.username}
    )
    assert res_forgot.status_code == 200
    forgot_data = res_forgot.json()
    assert "reset_token" in forgot_data
    reset_token = forgot_data["reset_token"]

    # 2. Reset password using the reset token
    res_reset = client.post(
        "/api/auth/reset-password",
        json={
            "identifier": user.username,
            "new_password": "ResetPassword456!",
            "reset_token": reset_token
        }
    )
    assert res_reset.status_code == 200
    assert "successfully reset" in res_reset.json()["message"]

    # 3. Verify user can now log in with the new password
    login_res = client.post(
        "/api/auth/login",
        json={"identifier": user.email, "password": "ResetPassword456!"}
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_profile_update_and_change_password():
    """
    Verifies user profile updates, changing own password, and stats retrieval.
    """
    user, token = make_test_user("profile_student", role="user")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get user profile stats
    res_stats = client.get("/api/auth/profile/stats", headers=headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_attempts" in stats
    assert "average_score" in stats

    # 2. Update profile username & email
    res_update = client.put(
        "/api/auth/profile",
        json={"username": "profile_student_renamed", "email": "renamed_student@example.com"},
        headers=headers
    )
    assert res_update.status_code == 200
    updated_user = res_update.json()
    assert updated_user["username"] == "profile_student_renamed"
    assert updated_user["email"] == "renamed_student@example.com"

    # 3. Attempt to change password with wrong current password -> 400
    res_wrong_pw = client.put(
        "/api/auth/change-password",
        json={"current_password": "WrongPassword!", "new_password": "FreshPassword789!"},
        headers=headers
    )
    assert res_wrong_pw.status_code == 400
    assert "Current password is incorrect" in res_wrong_pw.json()["detail"]

    # 4. Change password with correct current password ("Password123!")
    res_change_pw = client.put(
        "/api/auth/change-password",
        json={"current_password": "Password123!", "new_password": "FreshPassword789!"},
        headers=headers
    )
    assert res_change_pw.status_code == 200
    assert "Password changed successfully" in res_change_pw.json()["message"]

    # 5. Verify login with the freshly changed password
    login_res = client.post(
        "/api/auth/login",
        json={"identifier": "profile_student_renamed", "password": "FreshPassword789!"}
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

