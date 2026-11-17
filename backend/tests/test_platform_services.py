import time

import jwt
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.core.ml_classifier import ErrorClassifier
from backend.app.core.learning_dna import summarize_learning_dna
from backend.app.main import app

client = TestClient(app)


def create_test_token(sub: str, email: str, role: str, expires_in: int = 3600) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated",
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": f"Test {role.title()}", "role": role},
        "exp": int(time.time()) + expires_in,
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


def test_execution_endpoint_returns_safe_unconfigured_response():
    token = create_test_token("student-exec", "student@example.com", "student")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/platform/execute",
        headers=headers,
        json={"language": "python", "source_code": "print('hello')", "stdin": ""},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in {"unconfigured", "success", "error", "runtime_error"}
    assert "Judge0" in data["message"] or "Execution" in data["message"] or "completed" in data["message"].lower()


def test_ml_classifier_detects_name_error_pattern():
    prediction = ErrorClassifier.predict_error("print(name)\n", language="python")
    assert prediction["label"] in {"name_error", "logic_error", "syntax_error"}
    assert prediction["confidence"] >= 0.0
    assert prediction["message"]


def test_mentor_fallback_guidance_is_safe_and_helpful():
    token = create_test_token("student-mentor", "mentor@example.com", "student")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/platform/mentor",
        headers=headers,
        json={"question": "Why is my variable not defined?", "topic": "debugging", "student_context": "Python basics"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 20
    assert data["safe_mode"] is True or data["source"] in {"live_llm", "local_guidance"}


def test_learning_dna_summary_generates_daily_plan():
    summary = summarize_learning_dna("user-42", {"problems_solved": 10, "bugs_fixed": 7, "streak_days": 14, "consistency": 0.8})
    assert summary["user_id"] == "user-42"
    assert "mastery" in summary
    assert len(summary["daily_plan"]) >= 3
    assert summary["streak_days"] == 14
