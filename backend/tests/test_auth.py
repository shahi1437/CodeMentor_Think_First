import time
import jwt
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.core import role_store
from backend.app.main import app

client = TestClient(app)


def create_test_token(sub: str, email: str, role: str, expires_in: int = 3600) -> str:
    """Helper to generate signed Supabase-style JWT for tests"""
    if role_store.get_user_role(sub) is None:
        role_store.set_user_role(sub, role)
    payload = {
        "sub": sub,
        "iss": f"{settings.SUPABASE_URL}/auth/v1",
        "aud": "authenticated",
        "email": email,
        "role": "authenticated",  # Supabase aud / default
        "app_metadata": {"role": role},
        "user_metadata": {"full_name": f"Test {role.title()}", "role": role},
        "exp": int(time.time()) + expires_in,
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


def test_health_check():
    """Verify standard GET /health returns status ok"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "CodeMentor AI Backend" in data["service"]


def test_unauthenticated_request_fails():
    """Verify accessing protected routes without Bearer token returns 401"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_invalid_token_fails():
    """Verify malformed or tamper-signed token returns 401"""
    headers = {"Authorization": "Bearer invalid.token.signature"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "Invalid authentication token" in response.json()["detail"]


def test_expired_token_fails():
    """Verify expired token returns 401"""
    expired_token = create_test_token("std-exp-1", "exp@test.com", "student", expires_in=-300)
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_student_role_permissions():
    """
    Verify Student user:
    - Can access student resources
    - Is BLOCKED (403) from teacher and admin resources
    """
    student_token = create_test_token("std-123", "alex@student.edu", "student")
    headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Access Me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "student"

    # 2. Access Student Resource
    student_res = client.get("/api/v1/auth/student-resource", headers=headers)
    assert student_res.status_code == 200
    assert student_res.json()["status"] == "success"

    # 3. Access Teacher Resource -> FORBIDDEN
    teacher_res = client.get("/api/v1/auth/teacher-resource", headers=headers)
    assert teacher_res.status_code == 403
    assert "Access denied" in teacher_res.json()["detail"]

    # 4. Access Admin Resource -> FORBIDDEN
    admin_res = client.get("/api/v1/auth/admin-resource", headers=headers)
    assert admin_res.status_code == 403

    # 5. Call Assign Role -> FORBIDDEN
    assign_res = client.post(
        "/api/v1/auth/admin/assign-role",
        headers=headers,
        json={"user_id": "std-123", "target_role": "admin"},
    )
    assert assign_res.status_code == 403


def test_teacher_role_permissions():
    """
    Verify Teacher user:
    - Can access student and teacher resources
    - Is BLOCKED (403) from admin resources
    """
    teacher_token = create_test_token("tch-456", "marcus@prof.edu", "teacher")
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # 1. Student Resource -> ALLOWED
    student_res = client.get("/api/v1/auth/student-resource", headers=headers)
    assert student_res.status_code == 200

    # 2. Teacher Resource -> ALLOWED
    teacher_res = client.get("/api/v1/auth/teacher-resource", headers=headers)
    assert teacher_res.status_code == 200
    assert "Live Struggle Radar" in teacher_res.json()["features"]

    # 3. Admin Resource -> FORBIDDEN
    admin_res = client.get("/api/v1/auth/admin-resource", headers=headers)
    assert admin_res.status_code == 403


def test_admin_role_permissions():
    """
    Verify Admin user:
    - Can access student, teacher, and admin resources
    - Can successfully promote another user
    """
    admin_token = create_test_token("adm-999", "root@codementor.ai", "admin")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. All resources allowed
    assert client.get("/api/v1/auth/student-resource", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/teacher-resource", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/admin-resource", headers=headers).status_code == 200

    # 2. Promote student to teacher
    promote_res = client.post(
        "/api/v1/auth/admin/assign-role",
        headers=headers,
        json={"user_id": "std-123", "target_role": "teacher"},
    )
    assert promote_res.status_code == 200
    data = promote_res.json()
    assert data["success"] is True
    assert data["new_role"] == "teacher"
