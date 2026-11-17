import json
from datetime import datetime, timedelta, timezone
import time

import jwt
import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.core import role_store
from backend.app.core import ai_mentor
from backend.app.core.ml_classifier import ErrorClassifier
from backend.app.core.learning_dna import summarize_learning_dna
from backend.app.api.v1.endpoints import platform
from backend.app.main import app

client = TestClient(app)


def create_test_token(sub: str, email: str, role: str, expires_in: int = 3600) -> str:
    if role_store.get_user_role(sub) is None:
        role_store.set_user_role(sub, role)
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


def test_platform_status_reports_judge0_configuration(monkeypatch):
    monkeypatch.setattr(platform.settings, "JUDGE0_API_URL", "")
    token = create_test_token("student-status", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/status",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["judge0"] == "missing_config"


def test_ml_classifier_detects_name_error_pattern():
    prediction = ErrorClassifier.predict_error("print(name)\n", language="python")
    assert prediction["label"] in {"name_error", "logic_error", "syntax_error"}
    assert prediction["confidence"] >= 0.0
    assert prediction["message"]


def test_mentor_reports_missing_provider_configuration(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "")
    monkeypatch.setattr(settings, "LLM_API_URL", "")
    token = create_test_token("student-mentor", "mentor@example.com", "student")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post(
        "/api/v1/platform/mentor",
        headers=headers,
        json={"question": "Why is my variable not defined?"},
    )
    assert response.status_code == 503
    assert "LLM_API_URL and LLM_API_KEY" in response.json()["detail"]


@pytest.mark.asyncio
async def test_mentor_uses_configured_provider_with_socratic_history(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "test-provider-key")
    monkeypatch.setattr(settings, "LLM_API_URL", "https://llm.example.test/v1/chat/completions")
    monkeypatch.setattr(settings, "LLM_MODEL", "test-model")
    requests = []

    def handle_request(request):
        requests.append(request)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "What does the loop do when both bounds are adjacent?"}}]},
        )

    transport = httpx.MockTransport(handle_request)
    real_async_client = httpx.AsyncClient
    monkeypatch.setattr(
        ai_mentor.httpx,
        "AsyncClient",
        lambda **kwargs: real_async_client(transport=transport, **kwargs),
    )

    result = await ai_mentor.generate_mentor_response(
        "Why does my search loop stop progressing?",
        topic="binary search",
        student_context="Persisted Learning DNA: mastery={'debugging': 55.0}.",
        mode="socratic",
        history=[{"role": "user", "content": "I am reviewing binary search."}],
    )

    assert result == {
        "answer": "What does the loop do when both bounds are adjacent?",
        "source": "configured_llm",
        "safe_mode": False,
    }
    request_payload = json.loads(requests[0].content)
    assert request_payload["model"] == "test-model"
    assert request_payload["messages"][1]["content"] == "I am reviewing binary search."
    assert "Socratic" in request_payload["messages"][0]["content"]
    assert "Persisted Learning DNA" in request_payload["messages"][-1]["content"]
    assert requests[0].headers["authorization"] == "Bearer test-provider-key"


@pytest.mark.asyncio
async def test_mentor_provider_failure_is_not_replaced_with_simulated_answer(monkeypatch):
    monkeypatch.setattr(settings, "LLM_API_KEY", "test-provider-key")
    monkeypatch.setattr(settings, "LLM_API_URL", "https://llm.example.test/v1/chat/completions")
    real_async_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda _request: httpx.Response(503))
    monkeypatch.setattr(
        ai_mentor.httpx,
        "AsyncClient",
        lambda **kwargs: real_async_client(transport=transport, **kwargs),
    )

    with pytest.raises(ai_mentor.MentorProviderError, match="HTTP 503"):
        await ai_mentor.generate_mentor_response("Explain this error")


def test_mentor_endpoint_uses_persisted_learning_dna(monkeypatch):
    token = create_test_token("student-mentor-dna", "mentor@example.com", "student")
    captured = {}

    class FakeDatabase:
        configured = True

        def get_learning_dna_profile(self, user_id):
            assert user_id == "student-mentor-dna"
            return {"mastery": {"debugging": 61}, "streak_days": 3, "consistency": 0.6}

    async def fake_generate(question, topic, student_context, mode, history):
        captured.update(question=question, topic=topic, student_context=student_context, mode=mode, history=history)
        return {"answer": "Let's reason about the boundary update.", "source": "configured_llm", "safe_mode": False}

    monkeypatch.setattr(platform, "get_database_service", lambda: FakeDatabase())
    monkeypatch.setattr(platform, "generate_mentor_response", fake_generate)
    response = client.post(
        "/api/v1/platform/mentor",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question": "Why does the loop not progress?",
            "mode": "conceptual",
            "history": [{"role": "user", "content": "I am studying binary search."}],
        },
    )

    assert response.status_code == 200
    assert response.json()["answer"] == "Let's reason about the boundary update."
    assert "mastery={'debugging': 61}" in captured["student_context"]
    assert captured["mode"] == "conceptual"
    assert captured["history"][0]["role"] == "user"


def test_learning_dna_summary_uses_real_submission_history():
    today = datetime.now(timezone.utc).date()
    summary = summarize_learning_dna("user-42", [
        {
            "problem_id": "problem-1",
            "language": "python",
            "status": "passed",
            "runtime_metadata": {"verdict": "accepted"},
            "created_at": datetime.combine(today, datetime.min.time(), timezone.utc).isoformat(),
        },
        {
            "problem_id": "problem-2",
            "language": "python",
            "status": "failed",
            "runtime_metadata": {"verdict": "wrong_answer"},
            "created_at": datetime.combine(today, datetime.min.time(), timezone.utc).isoformat(),
        },
        {
            "problem_id": "problem-3",
            "language": "cpp",
            "status": "passed",
            "runtime_metadata": {"verdict": "accepted"},
            "created_at": datetime.combine(today - timedelta(days=1), datetime.min.time(), timezone.utc).isoformat(),
        },
    ], today=today)

    assert summary["user_id"] == "user-42"
    assert summary["mastery"] == {"cpp": 100.0, "python": 50.0}
    assert summary["problems_solved"] == 2
    assert summary["submission_count"] == 3
    assert summary["accepted_submission_count"] == 2
    assert summary["streak_days"] == 2
    assert summary["error_categories"] == {"wrong_answer": 1}
    assert summary["has_data"] is True
    assert summary["daily_plan"]


def test_learning_dna_empty_history_does_not_invent_metrics():
    summary = summarize_learning_dna("new-user", [], today=datetime.now(timezone.utc).date())

    assert summary["mastery"] == {}
    assert summary["daily_plan"] == []
    assert summary["streak_days"] == 0
    assert summary["has_data"] is False


def test_learning_dna_endpoint_requires_database_configuration(monkeypatch):
    class UnconfiguredDatabase:
        configured = False

    monkeypatch.setattr(platform, "get_database_service", lambda: UnconfiguredDatabase())
    token = create_test_token("student-dna-offline", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/learning-dna",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 503
    assert "Supabase database" in response.json()["detail"]


def test_problem_endpoints_never_return_hidden_test_cases(monkeypatch):
    hidden_problem = {
        "id": "public-problem-1",
        "title": "Public problem",
        "is_published": True,
        "hidden_test_cases": [{"input": "private-input", "expected_output": "private-output"}],
    }

    class ConfiguredDatabase:
        configured = True

        def list_problems(self, limit, include_hidden):
            return [hidden_problem]

        def get_problem(self, problem_id):
            return hidden_problem

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-problem-view", "student@example.com", "student")
    headers = {"Authorization": f"Bearer {token}"}

    list_response = client.get("/api/v1/platform/problems", headers=headers)
    detail_response = client.get("/api/v1/platform/problems/public-problem-1", headers=headers)

    assert list_response.status_code == 200
    assert detail_response.status_code == 200
    assert "hidden_test_cases" not in list_response.json()[0]
    assert "private-input" not in detail_response.text
    assert "private-output" not in detail_response.text


def test_problem_samples_and_hints_are_retrieved_without_hidden_data(monkeypatch):
    class ConfiguredDatabase:
        configured = True

        def get_problem(self, problem_id):
            return {
                "id": problem_id,
                "is_published": True,
                "problem_mode": "debugging",
                "progressive_hints": ["private future hint"],
            }

        def list_public_problem_test_cases(self, problem_id, limit):
            assert limit == 10
            return [{"id": "sample-1", "input_text": "1", "expected_output": "2"}]

        def list_problem_hints(self, problem_id):
            return ["Consider the loop boundary.", "Inspect the update expression."]

        def list_problem_hint_progress(self, user_id, problem_id):
            assert user_id == "student-debug-samples"
            return [1]

        def record_problem_hint_tier(self, user_id, problem_id, tier):
            assert (user_id, problem_id, tier) == ("student-debug-samples", "debug-problem", 2)

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-debug-samples", "student@example.com", "student")
    headers = {"Authorization": f"Bearer {token}"}

    samples = client.get("/api/v1/platform/problems/debug-problem/samples", headers=headers)
    hint = client.get("/api/v1/platform/problems/debug-problem/hints/2", headers=headers)

    assert samples.status_code == 200
    assert samples.json() == [{"id": "sample-1", "input_text": "1", "expected_output": "2"}]
    assert "private" not in samples.text
    assert hint.status_code == 200
    assert hint.json() == {"tier": 2, "hint": "Inspect the update expression."}
    assert "Consider the loop boundary." not in hint.text


def test_problem_hint_endpoint_prevents_skipping_tiers(monkeypatch):
    class ConfiguredDatabase:
        configured = True

        def get_problem(self, problem_id):
            return {"id": problem_id, "is_published": True, "problem_mode": "debugging"}

        def list_problem_hint_progress(self, _user_id, _problem_id):
            return []

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-debug-skip-hint", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/problems/debug-problem/hints/2",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409
    assert "previous hint tier" in response.json()["detail"]


def test_problem_hints_reject_invalid_tiers(monkeypatch):
    token = create_test_token("student-debug-invalid-tier", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/problems/debug-problem/hints/5",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


def test_learning_dna_endpoint_aggregates_only_current_users_submissions(monkeypatch):
    class ConfiguredDatabase:
        configured = True

        def list_learning_submissions(self, user_id, limit):
            assert user_id == "student-dna-live"
            assert limit == 500
            return [{
                "problem_id": "problem-1",
                "language": "javascript",
                "status": "passed",
                "runtime_metadata": {"verdict": "accepted"},
                "created_at": datetime.now(timezone.utc).isoformat(),
            }]

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-dna-live", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/learning-dna",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "student-dna-live"
    assert data["mastery"] == {"javascript": 100.0}
    assert data["problems_solved"] == 1
    assert data["has_data"] is True


def test_submission_verdicts_map_to_database_constraint_values():
    assert platform._submission_database_status("accepted") == "passed"
    assert platform._submission_database_status("wrong_answer") == "failed"
    assert platform._submission_database_status("configuration_error") == "error"


def test_submit_unconfigured_execution_does_not_report_wrong_answer(monkeypatch):
    stored = {}

    class ConfiguredDatabase:
        configured = True

        def get_problem(self, problem_id):
            return {"id": problem_id, "is_published": True}

        def list_problem_test_cases(self, problem_id, limit):
            return [{"input_text": "", "expected_output": "", "is_hidden": False}]

        def create_submission(self, payload):
            stored.update(payload)
            return {"id": "submission-1"}

    async def unconfigured_execution(_language, _source_code, _stdin):
        return {"status": "unconfigured", "stdout": "", "message": "Judge0 missing"}

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    monkeypatch.setattr(platform, "execute_code", unconfigured_execution)
    token = create_test_token("student-submit-offline", "student@example.com", "student")
    response = client.post(
        "/api/v1/platform/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"problem_id": "problem-1", "language": "python", "source_code": "print('x')"},
    )

    assert response.status_code == 200
    assert response.json()["verdict"] == "configuration_error"
    assert stored["status"] == "error"
    assert stored["runtime_metadata"]["verdict"] == "configuration_error"


def test_submission_uses_backend_test_cases_without_returning_hidden_data(monkeypatch):
    stored = {}
    executed_inputs = []
    grading_cases = [
        {"input_text": "public-case-input", "expected_output": "public-result", "is_hidden": False},
        {"input_text": "hidden-case-input", "expected_output": "hidden-result", "is_hidden": True},
    ]

    class ConfiguredDatabase:
        configured = True

        def get_problem(self, problem_id):
            return {"id": problem_id, "is_published": True}

        def list_problem_test_cases(self, problem_id, limit):
            assert problem_id == "problem-graded"
            assert limit == platform.MAX_GRADING_TEST_CASES + 1
            return grading_cases

        def create_submission(self, payload):
            stored.update(payload)
            return {"id": "submission-graded"}

    async def execute_stored_case(_language, _source_code, stdin):
        executed_inputs.append(stdin)
        expected = {
            "public-case-input": "public-result",
            "hidden-case-input": "hidden-result",
        }
        return {"status": "accepted", "stdout": expected[stdin]}

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    monkeypatch.setattr(platform, "execute_code", execute_stored_case)
    token = create_test_token("student-hidden-grading", "student@example.com", "student")
    response = client.post(
        "/api/v1/platform/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "problem_id": "problem-graded",
            "language": "python",
            "source_code": "print('output')",
        },
    )

    assert response.status_code == 200
    assert response.json()["verdict"] == "accepted"
    assert response.json()["total_test_count"] == 2
    assert executed_inputs == ["public-case-input", "hidden-case-input"]
    assert "hidden-case-input" not in response.text
    assert "hidden-result" not in response.text
    assert "hidden-case-input" not in str(stored["runtime_metadata"])


def test_submission_rejects_client_supplied_test_cases():
    token = create_test_token("student-client-tests", "student@example.com", "student")
    response = client.post(
        "/api/v1/platform/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "problem_id": "problem-1",
            "language": "python",
            "source_code": "print(1)",
            "test_cases": [{"input": "hidden", "expected_output": "answer", "is_hidden": True}],
        },
    )

    assert response.status_code == 422


def test_submission_rejects_language_not_enabled_for_problem(monkeypatch):
    class ConfiguredDatabase:
        configured = True

        def get_problem(self, problem_id):
            return {
                "id": problem_id,
                "is_published": True,
                "supported_languages": ["python"],
            }

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-language-filter", "student@example.com", "student")
    response = client.post(
        "/api/v1/platform/submit",
        headers={"Authorization": f"Bearer {token}"},
        json={"problem_id": "problem-language", "language": "javascript", "source_code": "console.log(1)"},
    )

    assert response.status_code == 422
    assert "does not support" in response.json()["detail"]


def test_student_submission_history_hides_legacy_test_outputs_and_other_users(monkeypatch):
    class ConfiguredDatabase:
        configured = True

        def list_submissions(self, user_id, limit):
            assert user_id == "student-history"
            assert limit == 20
            return [
                {
                    "id": "submission-own",
                    "user_id": "student-history",
                    "problem_id": "problem-1",
                    "status": "failed",
                    "score": 50,
                    "language": "python",
                    "created_at": "2026-11-18T10:00:00Z",
                    "runtime_metadata": {
                        "results": [{
                            "input": "legacy-hidden-input",
                            "expected_output": "legacy-hidden-output",
                            "actual_output": "private-execution-output",
                        }]
                    },
                    "stdout": "private-execution-output",
                    "source_code": "print('private')",
                },
                {
                    "id": "submission-other",
                    "user_id": "another-student",
                    "problem_id": "problem-2",
                    "status": "passed",
                },
            ]

    monkeypatch.setattr(platform, "get_database_service", lambda: ConfiguredDatabase())
    token = create_test_token("student-history", "student@example.com", "student")
    response = client.get(
        "/api/v1/platform/submissions",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "submission-own"
    assert "runtime_metadata" not in data[0]
    assert "stdout" not in data[0]
    assert "source_code" not in data[0]
    assert "legacy-hidden-input" not in response.text
    assert "legacy-hidden-output" not in response.text
    assert "private-execution-output" not in response.text
    assert "submission-other" not in response.text


@pytest.mark.parametrize(
    ("path", "expected_detail"),
    [
        ("/api/v1/platform/profile/student-2", "authorized course scope"),
        ("/api/v1/platform/submissions", "authorized course scope"),
        ("/api/v1/platform/profiles", "authorized course scope"),
    ],
)
def test_teacher_cannot_read_unscoped_student_records(path, expected_detail):
    token = create_test_token("teacher-unscoped", "teacher@example.com", "teacher")
    response = client.get(path, headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert expected_detail in response.json()["detail"]
