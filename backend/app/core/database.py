from __future__ import annotations

from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from backend.app.core.config import settings


PUBLIC_PROBLEM_COLUMNS = (
    "id",
    "title",
    "slug",
    "difficulty",
    "category",
    "description",
    "starter_code",
    "problem_mode",
    "tags",
    "supported_languages",
    "is_published",
    "created_at",
    "updated_at",
    "archived_at",
    "revision",
    "verified_revision",
)
PUBLIC_PROBLEM_FIELDS = frozenset(PUBLIC_PROBLEM_COLUMNS)


class DatabaseService:
    """Supabase-backed persistence abstraction for profiles and platform data."""

    def __init__(self, client: Optional[Client] = None):
        self.configured = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY)
        self.client = client
        self.configuration_error: Optional[str] = None
        if self.client is None and self.configured:
            try:
                self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            except Exception as exc:
                self.configuration_error = "Unable to initialize the Supabase database client."
                self.configured = False
                self.client = None

    def _require_client(self) -> Client:
        if not self.client:
            raise RuntimeError(
                self.configuration_error
                or "Supabase PostgreSQL configuration is missing. Set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY before using the database service."
            )
        return self.client

    @staticmethod
    def _extract_data(response: Any, default: Optional[Any] = None) -> Any:
        data = getattr(response, "data", None)
        if data is None:
            return default
        return data

    @staticmethod
    def _require_written_row(response: Any, resource: str) -> Dict[str, Any]:
        data = getattr(response, "data", None)
        if isinstance(data, dict):
            return dict(data)
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return dict(data[0])
        raise RuntimeError(f"Supabase did not confirm the persisted {resource} record.")

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
        response = client.table("profiles").upsert(payload, on_conflict="id").select("*").execute()
        return self._require_written_row(response, "profile")

    def create_problem(self, problem: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("problems").insert(problem).select("*").execute()
        return self._require_written_row(response, "problem")

    def get_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("problems")
            .select(",".join((*PUBLIC_PROBLEM_COLUMNS, "debugging_starter_code")))
            .eq("id", problem_id)
            .maybe_single()
            .execute()
        )
        data = self._extract_data(response)
        return data if isinstance(data, dict) else None

    def list_problems(self, limit: int = 20, include_hidden: bool = False) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("problems").select(",".join(PUBLIC_PROBLEM_COLUMNS))
        if not include_hidden:
            query = query.eq("is_published", True)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def get_admin_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        response = (
            self._require_client().table("problems")
            .select(",".join((*PUBLIC_PROBLEM_COLUMNS, "progressive_hints", "reference_solutions",
                              "debugging_starter_code", "test_cases:problem_test_cases(name,input_text,expected_output,is_hidden)")))
            .eq("id", problem_id).maybe_single().execute()
        )
        return self._extract_data(response)

    def save_problem_draft(self, problem_id, revision, author_id, draft):
        result = self._require_client().rpc("save_problem_draft", {
            "p_problem_id": problem_id, "p_revision": revision,
            "p_author_id": author_id, "p_draft": draft,
        }).execute()
        return self._extract_data(result)

    def change_problem_state(self, problem_id: str, revision: int, state: str) -> bool:
        result = self._require_client().rpc("change_problem_state", {
            "p_problem_id": problem_id, "p_revision": revision, "p_state": state,
        }).execute()
        return self._extract_data(result) is True

    def list_problem_test_cases(self, problem_id: str, limit: int = 101) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("problem_test_cases")
            .select("input_text,expected_output,is_hidden")
            .eq("problem_id", problem_id)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def list_public_problem_test_cases(self, problem_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("problem_test_cases")
            .select("id,name,input_text,expected_output")
            .eq("problem_id", problem_id)
            .eq("is_hidden", False)
            .order("created_at")
            .limit(limit)
            .execute()
        )
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def list_problem_hints(self, problem_id: str) -> List[str]:
        client = self._require_client()
        response = (
            client.table("problems")
            .select("progressive_hints")
            .eq("id", problem_id)
            .maybe_single()
            .execute()
        )
        data = self._extract_data(response)
        if not isinstance(data, dict):
            return []
        hints = data.get("progressive_hints")
        return [hint for hint in hints if isinstance(hint, str)] if isinstance(hints, list) else []

    def list_problem_hint_progress(self, user_id: str, problem_id: str) -> List[int]:
        client = self._require_client()
        response = (
            client.table("problem_hint_progress")
            .select("tier")
            .eq("user_id", user_id)
            .eq("problem_id", problem_id)
            .order("tier")
            .limit(4)
            .execute()
        )
        data = self._extract_data(response, [])
        return [
            int(row["tier"])
            for row in data
            if isinstance(row, dict) and isinstance(row.get("tier"), int)
        ] if isinstance(data, list) else []

    def record_problem_hint_tier(self, user_id: str, problem_id: str, tier: int) -> None:
        client = self._require_client()
        response = (
            client.table("problem_hint_progress")
            .upsert(
                {"user_id": user_id, "problem_id": problem_id, "tier": tier},
                on_conflict="user_id,problem_id,tier",
            )
            .select("user_id")
            .execute()
        )
        self._require_written_row(response, "problem hint progress")

    def update_problem(self, problem_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("problems").update(updates).eq("id", problem_id).select("*").execute()
        return self._require_written_row(response, "problem")

    def consume_execution_quota(self, user_id: str, action: str, limit: int, window_seconds: int) -> int:
        try:
            response = self._require_client().rpc("consume_execution_quota", {
                "p_user_id": user_id,
                "p_action": action,
                "p_limit": limit,
                "p_window_seconds": window_seconds,
            }).execute()
        except Exception as exc:
            raise RuntimeError("The shared execution quota is unavailable.") from exc
        retry_after = self._extract_data(response)
        if type(retry_after) is not int or retry_after < 0:
            raise RuntimeError("The shared execution quota returned an invalid response.")
        return retry_after

    def create_submission(self, submission: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("submissions").insert(submission).select("*").execute()
        return self._require_written_row(response, "submission")

    def list_submissions(self, user_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("submissions").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def list_learning_submissions(self, user_id: str, limit: int = 500) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("submissions")
            .select("problem_id,status,language,runtime_metadata,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def create_learning_dna_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("learning_dna_profiles").upsert(
            payload,
            on_conflict="user_id",
        ).select("*").execute()
        return self._require_written_row(response, "Learning DNA profile")

    def get_learning_dna_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("learning_dna_profiles")
            .select("mastery, streak_days, consistency, last_activity_at")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        data = self._extract_data(response)
        return data if isinstance(data, dict) else None

    def create_learning_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("learning_dna_events").insert(payload).select("*").execute()
        return self._require_written_row(response, "Learning DNA event")

    def create_daily_plan(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("daily_plans").insert(payload).select("*").execute()
        return self._require_written_row(response, "daily plan")

    def list_daily_plans(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = client.table("daily_plans").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def get_daily_plan(self, plan_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("daily_plans")
            .select("id,user_id,status")
            .eq("id", plan_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        data = self._extract_data(response)
        return data if isinstance(data, dict) else None

    def list_daily_plan_tasks(self, plan_id: str) -> List[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("daily_plan_tasks")
            .select("id,plan_id,title,description,task_type,completed,created_at,updated_at")
            .eq("plan_id", plan_id)
            .order("created_at")
            .execute()
        )
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def update_daily_plan_task(
        self,
        plan_id: str,
        task_id: str,
        completed: bool,
    ) -> Optional[Dict[str, Any]]:
        client = self._require_client()
        response = (
            client.table("daily_plan_tasks")
            .update({"completed": completed})
            .eq("id", task_id)
            .eq("plan_id", plan_id)
            .select("id,plan_id,completed")
            .execute()
        )
        data = self._extract_data(response, [])
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return dict(data[0])
        return None

    def create_daily_plan_task(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("daily_plan_tasks").insert(payload).select("*").execute()
        return self._require_written_row(response, "daily plan task")

    def create_course(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("courses").insert(payload).select("*").execute()
        return self._require_written_row(response, "course")

    def list_courses(self, teacher_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        client = self._require_client()
        query = client.table("courses").select("*")
        if teacher_id:
            query = query.eq("teacher_id", teacher_id)
        response = query.order("created_at", desc=True).limit(limit).execute()
        data = self._extract_data(response, [])
        return list(data) if isinstance(data, list) else []

    def count_active_course_enrollments(self, course_id: str) -> int:
        client = self._require_client()
        response = (
            client.table("course_enrollments")
            .select("id", count="exact", head=True)
            .eq("course_id", course_id)
            .eq("enrollment_status", "active")
            .execute()
        )
        count = getattr(response, "count", None)
        if not isinstance(count, int):
            raise RuntimeError("Supabase did not return an exact enrollment count.")
        return count

    def create_course_enrollment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = (
            client.table("course_enrollments")
            .upsert(payload, on_conflict="course_id,student_id")
            .select("*")
            .execute()
        )
        return self._require_written_row(response, "course enrollment")

    def create_mentor_conversation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("mentor_conversations").insert(payload).select("*").execute()
        return self._require_written_row(response, "mentor conversation")

    def create_mentor_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("mentor_messages").insert(payload).select("*").execute()
        return self._require_written_row(response, "mentor message")

    def create_knowledge_chunk(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("knowledge_chunks").insert(payload).select("*").execute()
        return self._require_written_row(response, "knowledge chunk")

    def create_audit_log(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        client = self._require_client()
        response = client.table("audit_logs").insert(payload).select("*").execute()
        return self._require_written_row(response, "audit log")

    def get_admin_dashboard_metrics(self) -> Dict[str, int]:
        client = self._require_client()

        def count_rows(table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
            query = client.table(table_name).select("id", count="exact", head=True)
            for column, value in (filters or {}).items():
                query = query.eq(column, value)
            response = query.execute()
            count = getattr(response, "count", None)
            if not isinstance(count, int):
                raise RuntimeError(f"Supabase did not return an exact count for {table_name}.")
            return count

        return {
            "total_users": count_rows("profiles"),
            "students": count_rows("profiles", {"role": "student"}),
            "teachers": count_rows("profiles", {"role": "teacher"}),
            "published_problems": count_rows("problems", {"is_published": True}),
            "submissions": count_rows("submissions"),
            "published_courses": count_rows("courses", {"is_published": True}),
        }


_database_service = DatabaseService()


def get_database_service() -> DatabaseService:
    return _database_service
