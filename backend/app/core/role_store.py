from typing import Optional, Protocol, Union

from supabase import Client, create_client

from backend.app.core.config import settings
from backend.app.schemas.auth import UserRole


class InactiveAccountError(RuntimeError):
    """Raised when a valid JWT belongs to a disabled application profile."""


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
        except ValueError as exc:
            raise ValueError(f"Unsupported role: {role}") from exc

    def get_user_role(self, user_id: str) -> Optional[UserRole]:
        try:
            response = (
                self.client.table("profiles")
                .select("role,is_active")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            raise RuntimeError("Unable to verify the user's role with Supabase.") from exc

        data = getattr(response, "data", None)
        if data is None:
            return None
        role_value = data.get("role") if isinstance(data, dict) else None
        if role_value is None:
            return None
        if isinstance(data, dict) and data.get("is_active") is False:
            raise InactiveAccountError("The account is inactive.")
        try:
            return UserRole(role_value)
        except ValueError as exc:
            raise RuntimeError("The user's persisted role is invalid.") from exc

    def set_user_role(self, user_id: str, role: Union[UserRole, str]) -> UserRole:
        resolved_role = self._coerce_role(role)
        try:
            response = (
                self.client.table("profiles")
                .update({"role": resolved_role.value})
                .eq("id", user_id)
                .select("id,role")
                .execute()
            )
        except Exception as exc:
            raise RuntimeError("Unable to persist the user's role with Supabase.") from exc
        data = getattr(response, "data", None)
        if not isinstance(data, list) or not data:
            raise LookupError("User profile not found.")
        if data[0].get("role") != resolved_role.value:
            raise RuntimeError("Supabase did not confirm the requested role assignment.")
        return resolved_role


class NullRoleRepository:
    """Repository that fails explicitly when database-backed roles are unavailable."""

    def get_user_role(self, user_id: str) -> Optional[UserRole]:
        raise RuntimeError(
            "Role verification requires Supabase. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    def set_user_role(self, user_id: str, role: Union[UserRole, str]) -> UserRole:
        raise RuntimeError(
            "Role assignment requires Supabase. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )


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
    try:
        return get_role_repository().get_user_role(user_id)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError("Unable to verify the user's role with Supabase.") from exc


def set_user_role(user_id: str, role: Union[UserRole, str]) -> UserRole:
    """Persist a role assignment to the profiles table."""
    try:
        return get_role_repository().set_user_role(user_id, role)
    except (LookupError, ValueError, RuntimeError):
        raise
    except Exception as exc:
        raise RuntimeError("Unable to persist the user's role with Supabase.") from exc
