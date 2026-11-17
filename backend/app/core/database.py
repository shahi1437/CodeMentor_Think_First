from __future__ import annotations

from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from backend.app.core.config import settings


class DatabaseService:
    """Supabase-backed persistence abstraction for profiles and platform data."""

    def __init__(self, client: Optional[Client] = None):
        self.configured = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        self.client = client
        if self.client is None and self.configured:
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            except Exception:
                self.configured = False
                self.client = None

    def _require_client(self) -> Client:
        if not self.client:
            raise RuntimeError(
                "Supabase PostgreSQL configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
                "before using the database service."
            )
        return self.client

    @staticmethod
    def _extract_data(response: Any, default: Optional[Any] = None) -> Any:
        data = getattr(response, "data", None)
        if data is None:
            return default
        return data

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = client.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        data = self._extract_data(response)
        return data if isinstance(data, dict) else None

    def list_profiles(self, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = client.table("profiles").select("*").limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def upsert_profile(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        payload = {
            "id": profile["id"],
            "email": profile.get("email"),
            "full_name": profile.get("full_name"),
            "role": profile.get("role", "student"),
            "preferred_language": profile.get("preferred_language", "python"),
            "is_active": profile.get("is_active", True),
        }
        response = client.table("profiles").upsert(payload, on_conflict="id").execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_problem(self, problem: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("problems").insert(problem).execute()
        data = self._extract_data(response, [problem])
        if isinstance(data, list) and data:
            return dict(data[0])
        return problem

    def get_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = client.table("problems").select("*").eq("id", problem_id).maybe_single().execute()
        data = self._extract_data(response)
        return data if isinstance(data, dict) else None

    def list_problems(self, limit: int = 20, include_hidden: bool = False) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("problems").select("*")
        if not include_hidden:
            query = query.eq("is_published", True)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def update_problem(self, problem_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("problems").update(updates).eq("id", problem_id).execute()
        data = self._extract_data(response, [updates])
        if isinstance(data, list) and data:
            return dict(data[0])
        return updates

    def create_submission(self, submission: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("submissions").insert(submission).execute()
        data = self._extract_data(response, [submission])
        if isinstance(data, list) and data:
            return dict(data[0])
        return submission

    def list_submissions(self, user_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("submissions").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def create_learning_dna_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("learning_dna_profiles").upsert(payload, on_conflict="user_id").execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_learning_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("learning_dna_events").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_daily_plan(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("daily_plans").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def list_daily_plans(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = client.table("daily_plans").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def create_daily_plan_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("daily_plan_tasks").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_course(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("courses").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def list_courses(self, teacher_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("courses").select("*")
        if teacher_id:
            query = query.eq("teacher_id", teacher_id)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def create_course_enrollment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("course_enrollments").upsert(payload, on_conflict="course_id,student_id").execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_mentor_conversation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("mentor_conversations").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_mentor_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("mentor_messages").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_knowledge_chunk(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("knowledge_chunks").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload

    def create_audit_log(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("audit_logs").insert(payload).execute()
        data = self._extract_data(response, [payload])
        if isinstance(data, list) and data:
            return dict(data[0])
        return payload


_database_service = DatabaseService()


def get_database_service() -> DatabaseService:
    return _database_service
