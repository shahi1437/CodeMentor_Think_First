import time
import jwt
import pytest
from fastapi import HTTPException

from backend.app.core.auth import decode_jwt_token, require_role
from backend.app.core.config import settings
from backend.app.schemas.auth import UserProfile, UserRole, RoleUpdateRequest
from backend.app.api.v1.endpoints.auth import assign_user_role


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


def test_decode_valid_token():
    token = create_test_token("user-1", "user@test.com", "student")
    payload = decode_jwt_token(token)
    assert payload.sub == "user-1"
    assert payload.email == "user@test.com"
    assert payload.role == UserRole.STUDENT


def test_decode_invalid_signature():
    token = create_test_token("user-1", "user@test.com", "student")
    tampered = token[:-4] + "abcd"
    with pytest.raises(HTTPException) as exc:
        decode_jwt_token(tampered)
    assert exc.value.status_code == 401
    assert "Invalid authentication token" in exc.value.detail


def test_decode_expired_token():
    expired_token = create_test_token("user-1", "user@test.com", "student", expires_in=-10)
    with pytest.raises(HTTPException) as exc:
        decode_jwt_token(expired_token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_require_role_student_allowed():
    checker = require_role([UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN])
    user = UserProfile(id="1", email="student@test.com", role=UserRole.STUDENT)
    res = await checker(user)
    assert res.role == UserRole.STUDENT


@pytest.mark.asyncio
async def test_require_role_student_denied_teacher_endpoint():
    checker = require_role([UserRole.TEACHER, UserRole.ADMIN])
    user = UserProfile(id="1", email="student@test.com", role=UserRole.STUDENT)
    with pytest.raises(HTTPException) as exc:
        await checker(user)
    assert exc.value.status_code == 403
    assert "Access denied" in exc.value.detail


@pytest.mark.asyncio
async def test_require_role_teacher_allowed():
    checker = require_role([UserRole.TEACHER, UserRole.ADMIN])
    user = UserProfile(id="2", email="teacher@test.com", role=UserRole.TEACHER)
    res = await checker(user)
    assert res.role == UserRole.TEACHER


@pytest.mark.asyncio
async def test_admin_assign_role_success():
    admin = UserProfile(id="admin-1", email="admin@test.com", role=UserRole.ADMIN)
    req = RoleUpdateRequest(user_id="user-123", target_role=UserRole.TEACHER)
    res = await assign_user_role(req, current_admin=admin)
    assert res.success is True
    assert res.new_role == UserRole.TEACHER


@pytest.mark.asyncio
async def test_admin_cannot_demote_self():
    admin = UserProfile(id="admin-1", email="admin@test.com", role=UserRole.ADMIN)
    req = RoleUpdateRequest(user_id="admin-1", target_role=UserRole.STUDENT)
    with pytest.raises(HTTPException) as exc:
        await assign_user_role(req, current_admin=admin)
    assert exc.value.status_code == 400
    assert "Safety guardrail" in exc.value.detail
