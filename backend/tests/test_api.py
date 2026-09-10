import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from tests.conftest import make_test_user

client = TestClient(app)


def test_upload_sample_docx():
    _, token = make_test_user("docx_admin", role="admin")
    sample_docx_path = os.path.join(os.path.dirname(__file__), "../../samples/sample_exam.docx")
    sample_docx_path = os.path.abspath(sample_docx_path)
    assert os.path.exists(sample_docx_path)

    with open(sample_docx_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("sample_exam.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "sample_exam.docx"
    assert data["total_questions_detected"] >= 5
    assert len(data["questions"]) >= 5


def test_upload_sample_pdf():
    _, token = make_test_user("pdf_admin", role="admin")
    sample_pdf_path = os.path.join(os.path.dirname(__file__), "../../samples/sample_exam.pdf")
    sample_pdf_path = os.path.abspath(sample_pdf_path)
    assert os.path.exists(sample_pdf_path)

    with open(sample_pdf_path, "rb") as f:
        response = client.post(
            "/api/upload",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("sample_exam.pdf", f, "application/pdf")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "sample_exam.pdf"
    assert data["total_questions_detected"] >= 5
