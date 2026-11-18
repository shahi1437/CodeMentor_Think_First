import time

import jwt
import pytest
from fastapi.testclient import TestClient

from backend.app.core import role_store
from backend.app.core.config import settings
from backend.app.main import app

client = TestClient(app)
ANALYZE_PATH = "/api/v1/platform/analyze"
RESPONSE_FIELDS = {
    "language",
    "analysis_type",
    "valid_syntax",
    "parse_error",
    "functions",
    "loops",
    "branches",
    "max_loop_depth",
    "time_complexity",
    "space_complexity",
    "findings",
    "estimates_are_heuristic",
    "complexity_basis",
    "limitations",
}


def auth_headers(sub: str = "student-analyzer", role: str = "student") -> dict[str, str]:
    if role_store.get_user_role(sub) is None:
        role_store.set_user_role(sub, role)
    payload = {
        "sub": sub,
        "iss": f"{settings.SUPABASE_URL}/auth/v1",
        "aud": "authenticated",
        "email": f"{sub}@example.com",
        "role": "authenticated",
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": "Test Student", "role": role},
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def analyze(source_code: str, headers: dict[str, str] | None = None):
    return client.post(
        ANALYZE_PATH,
        headers=headers or auth_headers(),
        json={"language": "python", "source_code": source_code},
    )


def test_analyzer_returns_stable_structured_response():
    response = analyze(
        "def add(a, b):\n"
        "    total = a + b\n"
        "    return total\n",
        headers=auth_headers("student-analyzer-valid"),
    )

    assert response.status_code == 200
    data = response.json()
    assert set(data) == RESPONSE_FIELDS
    assert data["language"] == "python"
    assert data["analysis_type"] == "python_ast"
    assert data["valid_syntax"] is True
    assert data["parse_error"] is None
    assert data["functions"] == [{
        "name": "add",
        "line": 1,
        "arguments": ["a", "b"],
        "recursive": False,
    }]
    assert data["loops"] == 0
    assert data["branches"] == 0
    assert data["max_loop_depth"] == 0
    assert data["time_complexity"] == "O(1) or O(log n)"
    assert data["space_complexity"] == "O(1)"
    assert data["findings"][0]["severity"] == "clean"
    assert data["estimates_are_heuristic"] is True
    assert "not a proof" in data["complexity_basis"]
    assert len(data["limitations"]) == 3
    assert "source_code" not in data
    assert "Traceback" not in response.text


def test_analyzer_reports_syntax_error_without_claiming_success():
    response = analyze(
        "def broken(:\n"
        "    return 1\n",
        headers=auth_headers("student-analyzer-syntax"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["valid_syntax"] is False
    assert data["parse_error"]["line"] == 1
    assert data["parse_error"]["message"]
    assert data["functions"] == []
    assert data["findings"] == []
    assert data["time_complexity"] == "Unknown"
    assert data["space_complexity"] == "Unknown"
    assert "Traceback" not in response.text


def test_analyzer_detects_nested_loops_and_quadratic_estimate():
    response = analyze(
        "def scan(values):\n"
        "    for left in values:\n"
        "        for right in values:\n"
        "            print(left, right)\n",
        headers=auth_headers("student-analyzer-nested"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["loops"] == 2
    assert data["max_loop_depth"] == 2
    assert data["time_complexity"] == "O(n^2)"
    assert any(finding["label"] == "Nested loop structure" for finding in data["findings"])


def test_analyzer_reports_functions_and_recursion():
    response = analyze(
        "def factorial(n):\n"
        "    if n <= 1:\n"
        "        return 1\n"
        "    return n * factorial(n - 1)\n",
        headers=auth_headers("student-analyzer-recursion"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["functions"][0]["name"] == "factorial"
    assert data["functions"][0]["recursive"] is True
    assert data["branches"] == 1
    assert data["space_complexity"] == "O(n)"


def test_analyzer_reports_collection_mutation_findings():
    response = analyze(
        "def remove_odds(values):\n"
        "    for value in values:\n"
        "        if value % 2:\n"
        "            values.remove(value)\n"
        "    return values\n",
        headers=auth_headers("student-analyzer-mutation"),
    )

    assert response.status_code == 200
    labels = {finding["label"] for finding in response.json()["findings"]}
    assert "Collection mutation during iteration" in labels
    assert "Linear remove inside loop" in labels


def test_analyzer_does_not_echo_source_code():
    response = analyze(
        "def private_function():\n"
        "    return 'private-source-marker'\n",
        headers=auth_headers("student-analyzer-privacy"),
    )

    assert response.status_code == 200
    assert "private-source-marker" not in response.text


def test_analyzer_rejects_empty_source():
    response = analyze("", headers=auth_headers("student-analyzer-empty"))

    assert response.status_code == 422


def test_analyzer_rejects_oversized_source():
    response = analyze("a" * 100_001, headers=auth_headers("student-analyzer-oversized"))

    assert response.status_code == 422


@pytest.mark.parametrize("payload", [
    {"language": "javascript", "source_code": "console.log(1)"},
    {"language": "python", "source_code": "print(1)", "unexpected": True},
    {"language": "python"},
])
def test_analyzer_rejects_invalid_request_payloads(payload):
    response = client.post(
        ANALYZE_PATH,
        headers=auth_headers("student-analyzer-invalid-payload"),
        json=payload,
    )

    assert response.status_code == 422


def test_analyzer_requires_authentication():
    response = client.post(ANALYZE_PATH, json={"source_code": "print(1)"})

    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_analyzer_rejects_invalid_bearer_token():
    response = client.post(
        ANALYZE_PATH,
        headers={"Authorization": "Bearer not-a-valid-token"},
        json={"source_code": "print(1)"},
    )

    assert response.status_code == 401
    assert "Traceback" not in response.text
