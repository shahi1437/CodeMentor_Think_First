import pytest

from backend.app.core import database, role_store
from backend.app.core.config import settings
from backend.app.schemas.auth import UserRole


class FakeRoleRepository:
    def __init__(self):
        self.roles = {}

    def get_user_role(self, user_id):
        return self.roles.get(user_id)

    def set_user_role(self, user_id, role):
        resolved = role if isinstance(role, UserRole) else UserRole(role)
        self.roles[user_id] = resolved
        return resolved


@pytest.fixture(autouse=True)
def isolate_auth_configuration(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://fixture.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
    monkeypatch.setattr(settings, "JUDGE0_API_URL", "")
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "test-only-jwt-signing-key-for-codementor")
    repository = FakeRoleRepository()
    monkeypatch.setattr(role_store, "_role_repository", repository)
    monkeypatch.setattr(database, "_database_service", database.DatabaseService())
    return repository
