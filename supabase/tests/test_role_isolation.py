"""Exercise the disposable Supabase stack through actual signed-in Auth sessions."""

import os
from concurrent.futures import ThreadPoolExecutor
import subprocess
from collections.abc import Iterator
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
import pytest


@pytest.fixture(scope="session")
def stack() -> Iterator[tuple[httpx.Client, dict[str, str]]]:
    workdir = os.environ.get("CODEMENTOR_SUPABASE_TEST_WORKDIR")
    if not workdir:
        pytest.skip("Start a disposable Supabase stack and set CODEMENTOR_SUPABASE_TEST_WORKDIR.")
    path = Path(workdir).resolve(strict=True)
    if (path / "supabase" / ".temp" / "project-ref").exists():
        pytest.fail("Use a disposable Supabase workdir with no hosted project link.")
    result = subprocess.run(
        ["supabase", "status", "-o", "env"], cwd=path, capture_output=True, text=True, timeout=30,
    )
    if result.returncode:
        pytest.fail("The disposable local Supabase stack is unavailable.")
    settings = dict(line.strip().split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    settings = {key: value.strip('"') for key, value in settings.items()}
    api_url = settings.get("API_URL", "")
    if urlsplit(api_url).hostname not in {"localhost", "127.0.0.1", "::1"}:
        pytest.fail("Role-isolation fixtures require a loopback Supabase API.")
    settings["ANON_KEY"] = settings.get("ANON_KEY") or settings.get("PUBLISHABLE_KEY", "")
    settings["SERVICE_ROLE_KEY"] = settings.get("SERVICE_ROLE_KEY") or settings.get("SECRET_KEY", "")
    if not settings["ANON_KEY"] or not settings["SERVICE_ROLE_KEY"]:
        pytest.fail("The local Supabase stack did not report API keys.")
    with httpx.Client(base_url=api_url, trust_env=False, timeout=15) as client:
        yield client, settings


def headers(key: str, token: str | None = None) -> dict[str, str]:
    result = {"apikey": key, "Prefer": "return=representation"}
    if token or key.startswith("eyJ"):
        result["Authorization"] = f"Bearer {token or key}"
    return result


def successful(response: httpx.Response, operation: str) -> None:
    assert response.is_success, f"{operation} returned HTTP {response.status_code}"


@pytest.fixture(scope="module")
def fixtures(stack):
    client, settings = stack
    service = headers(settings["SERVICE_ROLE_KEY"])
    anon_key = settings["ANON_KEY"]
    suffix = uuid4().hex
    users = {}
    for name, role in (
        ("active", "student"), ("paused", "student"), ("other", "student"),
        ("teacher", "teacher"), ("other_teacher", "teacher"), ("admin", "admin"),
    ):
        email = f"{name}-{suffix}@example.com"
        password = uuid4().hex
        result = client.post("/auth/v1/admin/users", headers=service, json={
            "email": email, "password": password, "email_confirm": True,
            "user_metadata": {"full_name": name, "role": "admin"},
        })
        successful(result, "Create synthetic account")
        user_id = result.json()["id"]
        profile = client.get("/rest/v1/profiles", headers=service, params={"id": f"eq.{user_id}"})
        successful(profile, "Read new profile")
        assert profile.json()[0]["role"] == "student"
        result = client.patch("/rest/v1/profiles", headers=service, params={"id": f"eq.{user_id}"},
                              json={"role": role})
        successful(result, "Seed trusted account role")
        session = client.post("/auth/v1/token", params={"grant_type": "password"}, headers=headers(anon_key),
                              json={"email": email, "password": password})
        successful(session, "Sign in synthetic account")
        users[name] = (user_id, headers(anon_key, session.json()["access_token"]))

    def insert(table, **record):
        response = client.post(f"/rest/v1/{table}", headers=service, json=record)
        successful(response, f"Seed {table}")
        return response.json()[0]["id"]

    course = insert("courses", teacher_id=users["teacher"][0], title="Local course")
    external_course = insert("courses", teacher_id=users["other_teacher"][0], title="Other local course")
    problem = insert("problems", title="Original local fixture", is_published=True)
    sample = insert("problem_test_cases", problem_id=problem, name="Sample")
    secret_case = insert("problem_test_cases", problem_id=problem, name="Private fixture", is_hidden=True)
    enrollments = {}
    conversations = {}
    submissions = {}
    for name, course_id, enrollment_status in (
        ("active", course, "active"), ("paused", course, "paused"), ("other", external_course, "active"),
    ):
        user_id = users[name][0]
        enrollments[name] = insert("course_enrollments", course_id=course_id, student_id=user_id,
                                   enrollment_status=enrollment_status)
        conversations[name] = insert("mentor_conversations", user_id=user_id, course_id=course_id)
        submissions[name] = insert("submissions", user_id=user_id, problem_id=problem, source_code="pass")
    conversations["mismatch"] = insert("mentor_conversations", user_id=users["active"][0], course_id=external_course)
    return users, course, external_course, problem, sample, secret_case, enrollments, conversations, submissions


def read_ids(client, auth, table, ids):
    result = client.get(f"/rest/v1/{table}", headers=auth, params={
        "select": "id", "id": f"in.({','.join(ids)})",
    })
    successful(result, f"Read allowed {table} fields")
    return {row["id"] for row in result.json()}


def test_student_ownership_and_grading_privacy(stack, fixtures):
    client, _ = stack
    users, _, external_course, problem, sample, secret_case, enrollments, conversations, submissions = fixtures
    student_id, auth = users["active"]
    for table, ids in (
        ("profiles", {name: user[0] for name, user in users.items()}),
        ("submissions", submissions), ("course_enrollments", enrollments),
    ):
        assert read_ids(client, auth, table, ids.values()) == {ids["active"]}
    assert read_ids(client, auth, "mentor_conversations", conversations.values()) == {
        conversations["active"], conversations["mismatch"],
    }
    assert read_ids(client, auth, "problem_test_cases", [sample, secret_case]) == {sample}

    for table, column in (("problems", "hidden_test_cases"), ("problems", "progressive_hints"),
                          ("submissions", "runtime_metadata"), ("submissions", "stdout")):
        result = client.get(f"/rest/v1/{table}", headers=auth, params={"select": column})
        assert result.status_code == 403

    profile_url = f"/rest/v1/profiles?id=eq.{student_id}"
    successful(client.patch(profile_url, headers=auth, json={"full_name": "Updated student"}), "Update own name")
    for field in ({"role": "admin"}, {"is_active": False}):
        assert client.patch(profile_url, headers=auth, json=field).status_code == 403
    for table, data in (
        ("submissions", {"user_id": student_id, "problem_id": problem, "source_code": "pass"}),
        ("course_enrollments", {"student_id": student_id, "course_id": external_course}),
        ("courses", {"teacher_id": student_id, "title": "Unauthorized course"}),
        ("mentor_messages", {"conversation_id": conversations["other"], "sender_id": student_id,
                             "sender_role": "student", "message": "Other person's thread"}),
        ("mentor_messages", {"conversation_id": conversations["active"], "sender_id": student_id,
                             "sender_role": "admin", "message": "Wrong sender role"}),
    ):
        assert client.post(f"/rest/v1/{table}", headers=auth, json=data).status_code == 403

    for table, row_id, change in (
        ("submissions", submissions["active"], {"score": 100}),
        ("course_enrollments", enrollments["active"], {"enrollment_status": "paused"}),
    ):
        path = f"/rest/v1/{table}?id=eq.{row_id}&select=id"
        for response in (client.patch(path, headers=auth, json=change), client.delete(path, headers=auth)):
            assert response.status_code == 403 or (response.is_success and response.json() == [])
        assert read_ids(client, auth, table, [row_id]) == {row_id}


def test_teacher_active_enrollment_and_admin_scope(stack, fixtures):
    client, _ = stack
    users, _, _, _, sample, secret_case, enrollments, conversations, submissions = fixtures
    profile_ids = [user[0] for user in users.values()]
    teacher_id, teacher = users["teacher"]
    assert read_ids(client, teacher, "profiles", profile_ids) == {teacher_id, users["active"][0]}
    assert read_ids(client, teacher, "mentor_conversations", conversations.values()) == {conversations["active"]}
    assert read_ids(client, teacher, "course_enrollments", enrollments.values()) == {
        enrollments["active"], enrollments["paused"],
    }
    assert read_ids(client, teacher, "submissions", submissions.values()) == set()
    assert read_ids(client, teacher, "problem_test_cases", [sample, secret_case]) == {sample}
    _, admin = users["admin"]
    for table, ids in (("profiles", profile_ids), ("submissions", submissions.values()),
                       ("mentor_conversations", conversations.values()), ("problem_test_cases", [sample, secret_case])):
        assert read_ids(client, admin, table, ids) == set(ids)


def test_shared_quota_is_atomic_across_requests(stack, fixtures):
    client, settings = stack
    users = fixtures[0]
    url = "/rest/v1/rpc/consume_execution_quota"
    service = headers(settings["SERVICE_ROLE_KEY"])

    def consume(user, action):
        return client.post(url, headers=service, json={
            "p_user_id": users[user][0], "p_action": action, "p_limit": 3,
            "p_window_seconds": 3600,
        })

    with ThreadPoolExecutor(max_workers=12) as executor:
        responses = list(executor.map(lambda _: consume("active", "run"), range(12)))
    for response in responses:
        successful(response, "Consume execution quota")
    retry_delays = [response.json() for response in responses]
    assert retry_delays.count(0) == 3
    assert sum(delay > 0 for delay in retry_delays) == 9
    assert consume("paused", "run").json() == 0
    assert consume("active", "submit").json() == 0
    result = client.post(url, headers=users["active"][1], json={
        "p_user_id": users["active"][0], "p_action": "run", "p_limit": 100,
        "p_window_seconds": 3600,
    })
    assert result.status_code in {403, 404}
