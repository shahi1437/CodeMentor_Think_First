from typing import Optional, Protocol, Union

from supabase import Client, create_client

from backend.app.core.config import settings
from backend.app.schemas.auth import UserRole


class RoleRepository(Protocol):
    def get_user_role(self, user_id: str) -> Optional[UserRole]:
        ...

    def set_user_role(self, user_id: str, role: Union[UserRole, str]) -> UserRole:
        ...


class SupabaseRoleRepository:
    """Database-backed role repository backed by the public.profiles table."""

    def __init__(self, client: Optional[Client] = None):
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "Supabase database configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before using database-backed role persistence."
            )
        self.client = client or create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    @staticmethod
    def _coerce_role(role: Union[UserRole, str]) -> UserRole:
        try:
            return role if isinstance(role, UserRole) else UserRole(role)
        except ValueError:
            return UserRole.STUDENT

    def get_user_role(self, user_id: str) -> Optional[UserRole]:
        try:
            response = (
                self.client.table("profiles")
                .select("role")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
        except Exception:
            return None

        data = getattr(response, "data", None)
        if not data:
            return None
        role_value = data.get("role") if isinstance(data, dict) else None
        if role_value is None:
            return None
        try:
            return UserRole(role_value)
        except ValueError:
            return UserRole.STUDENT

    def set_user_role(self, user_id: str, role: Union[UserRole, str]) -> UserRole:
        resolved_role = self._coerce_role(role)
        self.client.table("profiles").upsert(
            {
                "id": user_id,
                "role": resolved_role.value,
            },
            on_conflict="id",
        ).execute()
        return resolved_role


class NullRoleRepository:
    """Safe no-op repository used when no database service is configured."""

    def get_user_role(self, user_id: str) -> Optional[UserRole]:
        return None

    def set_user_role(self, user_id: str, role: Union[UserRole, str]) -> UserRole:
        try:
            return UserRole(role) if isinstance(role, str) else role
        except ValueError:
            return UserRole.STUDENT


_role_repository: Optional[RoleRepository] = None


def get_role_repository() -> RoleRepository:
    global _role_repository
    if _role_repository is None:
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            _role_repository = SupabaseRoleRepository()
        else:
            _role_repository = NullRoleRepository()
    return _role_repository


def get_user_role(user_id: str) -> Optional[UserRole]:
    """Read the currently persisted role from the profiles table."""
    return get_role_repository().get_user_role(user_id)


def set_user_role(user_id: str, role: Union[UserRole, str]) -> UserRole:
    """Persist a role assignment to the profiles table."""
    return get_role_repository().set_user_role(user_id, role)
