from __future__ import annotations

from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from backend.app.core.config import settings


class DatabaseService:
    """Small Supabase-backed persistence abstraction for profiles and platform data."""

    def __init__(self, client: Optional[Client] = None):
        self.configured = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        self.client = client or (create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY) if self.configured else None)

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.client:
            return None
        try:
            response = self.client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
            return getattr(response, "data", None) or None
        except Exception:
            return None

    def list_profiles(self, limit: int = 20) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        try:
            response = self.client.table("profiles").select("*").limit(limit).execute()
            data = getattr(response, "data", None) or []
            return list(data)
        except Exception:
            return []

    def upsert_profile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return profile
        try:
            payload = {"id": profile["id"], "email": profile.get("email"), "full_name": profile.get("full_name"), "role": profile.get("role", "student"), "preferred_language": profile.get("preferred_language", "python"), "is_active": profile.get("is_active", True)}
            response = self.client.table("profiles").upsert(payload, on_conflict="id").execute()
            data = getattr(response, "data", None) or []
            if isinstance(data, list) and data:
                return data[0]
            return payload
        except Exception:
            return profile


_database_service = DatabaseService()


def get_database_service() -> DatabaseService:
    return _database_service
