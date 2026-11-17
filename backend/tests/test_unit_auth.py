import time
import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import backend.app.core.role_store as role_store
from backend.app.core.auth import decode_jwt_token, get_current_user, require_role
from backend.app.core.config import settings
from backend.app.schemas.auth import UserProfile, UserRole, RoleUpdateRequest
from backend.app.api.v1.endpoints.auth import assign_user_role


class FakeRoleRepository:
    def __init__(self):
        self.roles = {}

    def get_user_role(self, user_id):
        return self.roles.get(user_id)

    def set_user_role(self, user_id, role):
        resolved = role if isinstance(role, UserRole) else UserRole(role)
        self.roles[user_id] = resolved
        return resolved


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
async def test_admin_assign_role_success(monkeypatch):
    fake_repo = FakeRoleRepository()
    monkeypatch.setattr(role_store, "_role_repository", fake_repo)

    admin = UserProfile(id="admin-1", email="admin@test.com", role=UserRole.ADMIN)
    req = RoleUpdateRequest(user_id="user-123", target_role=UserRole.TEACHER)
    res = await assign_user_role(req, current_admin=admin)
    assert res.success is True
    assert res.new_role == UserRole.TEACHER
    assert fake_repo.get_user_role("user-123") == UserRole.TEACHER


@pytest.mark.asyncio
async def test_database_role_is_authoritative_over_jwt_claim(monkeypatch):
    fake_repo = FakeRoleRepository()
    fake_repo.set_user_role("user-456", UserRole.ADMIN)
    monkeypatch.setattr(role_store, "_role_repository", fake_repo)

    token = create_test_token("user-456", "user@test.com", "student")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = await get_current_user(credentials)
    assert user.role == UserRole.ADMIN


@pytest.mark.asyncio
async def test_student_cannot_change_roles_directly(monkeypatch):
    fake_repo = FakeRoleRepository()
    monkeypatch.setattr(role_store, "_role_repository", fake_repo)

    student = UserProfile(id="student-1", email="student@test.com", role=UserRole.STUDENT)
    req = RoleUpdateRequest(user_id="student-1", target_role=UserRole.ADMIN)

    with pytest.raises(HTTPException) as exc:
        await assign_user_role(req, current_admin=student)

    assert exc.value.status_code == 403
    assert "administrative privileges" in exc.value.detail


@pytest.mark.asyncio
async def test_admin_cannot_demote_self():
    admin = UserProfile(id="admin-1", email="admin@test.com", role=UserRole.ADMIN)
    req = RoleUpdateRequest(user_id="admin-1", target_role=UserRole.STUDENT)
    with pytest.raises(HTTPException) as exc:
        await assign_user_role(req, current_admin=admin)
    assert exc.value.status_code == 400
    assert "Safety guardrail" in exc.value.detail
