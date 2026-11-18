from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from backend.app.api.v1.endpoints import problem_admin
from backend.app.core.auth import get_current_user
from backend.app.main import app
from backend.app.schemas.auth import UserProfile, UserRole


@pytest.fixture
def authoring(monkeypatch):
    role = UserRole.ADMIN
    records = {}

    class Store:
        def get_admin_problem(self, problem_id):
            return records.get(problem_id)

        def save_problem_draft(self, problem_id, revision, author_id, draft):
            if problem_id is None:
                problem_id = str(uuid4())
            elif records[problem_id]["revision"] != revision or records[problem_id]["is_published"]:
                return None
            records[problem_id] = {
                **draft, "id": problem_id, "revision": (revision or 0) + 1,
                "is_published": False, "archived_at": None, "created_by": author_id,
            }
            return problem_id

        def change_problem_state(self, problem_id, revision, state):
            row = records[problem_id]
            if row["revision"] != revision:
                return False
            row.update(revision=revision + 1, is_published=state == "published",
                       archived_at="2026-11-18" if state == "archived" else None)
            return True

    account = UserProfile(id=str(uuid4()), email="author@example.com", role=role)
    monkeypatch.setattr(problem_admin, "get_database_service", Store)
    app.dependency_overrides[get_current_user] = lambda: account
    original = {
        "title": "Double a whole number", "description": "Read an integer and print twice its value.",
        "problem_mode": "both", "reference_solutions": {"python": "print(2*int(input()))"},
        "debugging_starter_code": {"python": "print(int(input())+2)"},
        "test_cases": [
            {"name": "Public", "input_text": "2", "expected_output": "4"},
            {"name": "Private", "input_text": "3", "expected_output": "6", "is_hidden": True},
        ],
    }
    try:
        with TestClient(app) as client:
            yield client, account, records, original
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_verified_problem_lifecycle(authoring, monkeypatch):
    client, _, _, original = authoring
    root = "/api/v1/admin/problems"
    created = client.post(root, json=original)
    assert created.status_code == 201
    record = created.json()
    path = root + "/" + record["id"]
    assert client.get(path).json()["test_cases"][1]["is_hidden"]
    changed = client.put(path, json={**original, "title": "Double an integer", "revision": 1})
    assert changed.status_code == 200
    assert changed.json()["revision"] == 2

    async def judge(_language, program, stdin):
        output = int(stdin) * 2 if program == original["reference_solutions"]["python"] else int(stdin) + 2
        return {"status": "accepted", "stdout": str(output)}

    monkeypatch.setattr(problem_admin, "execute_code", judge)
    assert client.post(path + "/state", json={"state": "published", "revision": 1}).status_code == 409
    published = client.post(path + "/state", json={"state": "published", "revision": 2})
    assert published.status_code == 200 and published.json()["is_published"]
    assert client.put(path, json={**original, "revision": 3}).status_code == 409
    assert client.post(path + "/state", json={"state": "draft", "revision": 3}).status_code == 200
    archived = client.post(path + "/state", json={"state": "archived", "revision": 4})
    assert archived.status_code == 200 and archived.json()["archived_at"]
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("result,expected", [("accepted", 422), ("error", 503), ("unconfigured", 503)])
def test_invalid_or_unavailable_judge_keeps_problem_unpublished(authoring, monkeypatch, result, expected):
    client, _, records, original = authoring
    root = "/api/v1/admin/problems"
    record = client.post(root, json=original).json()
    calls = AsyncMock(side_effect=(
        [{"status": "accepted", "stdout": output} for output in ("4", "6", "4", "6")]
        if result == "accepted" else None
    ), return_value={"status": result, "stdout": "private detail"})
    monkeypatch.setattr(problem_admin, "execute_code", calls)

    response = client.post(root + "/" + record["id"] + "/state", json={"state": "published", "revision": 1})

    assert response.status_code == expected
    assert "private detail" not in response.text
    assert not records[record["id"]]["is_published"]


@pytest.mark.parametrize("role", [UserRole.STUDENT, UserRole.TEACHER])
def test_problem_authoring_requires_admin(authoring, role):
    client, account, records, original = authoring
    account.role = role
    assert client.post("/api/v1/admin/problems", json=original).status_code == 403
    assert not records
