from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from backend.app.api.v1.endpoints import platform
from backend.app.core.auth import get_current_user
from backend.app.main import app
from backend.app.schemas.auth import UserProfile, UserRole


@pytest.fixture
def student_client():
    student = UserProfile(id="student-1", email="student@example.com", role=UserRole.STUDENT)
    app.dependency_overrides[get_current_user] = lambda: student
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.parametrize("path,action", [("execute", "run"), ("submit", "submit")])
@pytest.mark.parametrize("retry_after,status_code", [(0, 200), (17, 429), (None, 503)])
def test_execution_checks_shared_quota_before_judge0(
    monkeypatch, student_client, path, action, retry_after, status_code,
):
    called = []

    class QuotaDatabase:
        def consume_execution_quota(self, user_id, requested_action, limit, window):
            called.append((user_id, requested_action, limit, window))
            if retry_after is None:
                raise RuntimeError("Database unavailable")
            return retry_after

        def get_problem(self, problem_id):
            return {"id": problem_id, "is_published": True}

        def list_problem_test_cases(self, _problem_id, limit):
            return [{"input_text": "", "expected_output": "42", "is_hidden": True}]

        def create_submission(self, payload):
            assert payload["user_id"] == "student-1"
            assert payload["score"] == 100
            return {"id": "submission"}

    monkeypatch.setattr(platform, "get_database_service", QuotaDatabase)
    monkeypatch.setattr(platform.settings, "JUDGE0_API_URL", "http://judge0.test")
    judge = AsyncMock(return_value={"status": "accepted", "stdout": "42", "configured": True})
    monkeypatch.setattr(platform, "execute_code", judge)
    request = {"source_code": "print(42)", "language": "python"}
    if action == "submit":
        request["problem_id"] = "original-problem"

    response = student_client.post(f"/api/v1/platform/{path}", json=request)

    assert response.status_code == status_code
    assert called == [("student-1", action, 20 if action == "run" else 3, 60)]
    assert judge.await_count == (1 if retry_after == 0 else 0)
    if status_code == 429:
        assert response.headers["Retry-After"] == "17"
    if status_code == 503:
        assert "execution limit is temporarily unavailable" in response.json()["detail"]
