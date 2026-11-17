import pytest
from fastapi import HTTPException

from backend.app.api.v1.endpoints.platform import get_profile
from backend.app.core.config import settings
from backend.app.core.database import DatabaseService
from backend.app.core.role_store import InactiveAccountError, SupabaseRoleRepository
from backend.app.schemas.auth import UserProfile, UserRole


class FakeTable:
    def __init__(self, name, rows=None):
        self.name = name
        self.rows = rows or []
        self.filters = []
        self.payload = None
        self.method = None
        self.single = False
        self.limit_value = None
        self.order_value = None
        self.selected_columns = None
        self.head = False
        self.count_mode = None

    def select(self, *args, **kwargs):
        if self.method is None:
            self.filters = []
            self.single = False
            self.limit_value = None
            self.order_value = None
            self.head = False
            self.count_mode = None
        selected = args[0] if args else "*"
        self.selected_columns = None if selected == "*" else [column.strip() for column in selected.split(",")]
        self.head = kwargs.get("head", False)
        self.count_mode = kwargs.get("count")
        return self

    def _project(self, row):
        if self.selected_columns is None:
            return row
        return {key: row[key] for key in self.selected_columns if key in row}

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def maybe_single(self):
        self.single = True
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def order(self, column, desc=False):
        self.order_value = (column, desc)
        return self

    def insert(self, payload):
        self.payload = payload
        self.method = "insert"
        return self

    def upsert(self, payload, on_conflict=None):
        self.payload = payload
        self.method = "upsert"
        return self

    def update(self, payload):
        self.payload = payload
        self.method = "update"
        return self

    def execute(self):
        try:
            if self.head:
                result = [
                    row for row in self.rows
                    if all(row.get(key) == value for key, value in self.filters)
                ]
                count = len(result) if self.count_mode == "exact" else None
                self.method = None
                return type("Response", (), {"data": None, "count": count})()

            if self.method in {"insert", "upsert"}:
                row = self.payload
                if isinstance(row, list):
                    for item in row:
                        existing_idx = next(
                            (idx for idx, existing in enumerate(self.rows) if existing.get("id") == item.get("id")),
                            None,
                        )
                        if existing_idx is not None:
                            self.rows[existing_idx] = item
                        else:
                            self.rows.append(item)
                    result = row
                else:
                    existing_idx = next(
                        (idx for idx, existing in enumerate(self.rows) if existing.get("id") == row.get("id")),
                        None,
                    )
                    if existing_idx is not None:
                        self.rows[existing_idx] = row
                    else:
                        self.rows.append(row)
                    result = [row]
                self.method = None
                return type("Response", (), {"data": result})()

            if self.method == "update":
                result = []
                for row in self.rows:
                    if all(row.get(key) == value for key, value in self.filters):
                        row.update(self.payload)
                        result.append(self._project(row))
                self.method = None
                return type("Response", (), {"data": result})()

            if self.single:
                for row in self.rows:
                    if all(row.get(key) == value for key, value in self.filters):
                        self.method = None
                        return type("Response", (), {"data": self._project(row)})()
                self.method = None
                return type("Response", (), {"data": None})()

            if self.order_value:
                result = [
                    row for row in self.rows
                    if all(row.get(key) == value for key, value in self.filters)
                ]
                if self.limit_value:
                    result = result[: self.limit_value]
                result = [self._project(row) for row in result]
                self.method = None
                return type("Response", (), {"data": result})()

            if self.limit_value:
                result = list(self.rows)[: self.limit_value]
            else:
                result = list(self.rows)
            result = [self._project(row) for row in result]
            self.method = None
            return type("Response", (), {"data": result})()
        finally:
            self.filters = []
            self.single = False
            self.limit_value = None
            self.order_value = None
            self.selected_columns = None
            self.head = False
            self.count_mode = None


class FakeSupabaseClient:
    def __init__(self, rows_by_table):
        self.tables = {name: FakeTable(name, rows) for name, rows in rows_by_table.items()}

    def table(self, name):
        return self.tables.setdefault(name, FakeTable(name, []))


def test_database_service_persists_profile_role_changes():
    client = FakeSupabaseClient({
        "profiles": [{"id": "user-1", "email": "student@example.com", "role": "student", "full_name": "Test Student"}],
    })
    service = DatabaseService(client=client)

    updated = service.upsert_profile({
        "id": "user-1",
        "email": "student@example.com",
        "full_name": "Test Student",
        "role": "teacher",
        "preferred_language": "python",
        "is_active": True,
    })

    assert updated["role"] == "teacher"
    assert service.get_user_profile("user-1")["role"] == "teacher"


def test_supabase_role_repository_updates_existing_profile_and_confirms_write(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    client = FakeSupabaseClient({
        "profiles": [{"id": "user-1", "email": "student@example.com", "role": "student"}],
    })
    repository = SupabaseRoleRepository(client=client)

    assert repository.set_user_role("user-1", "teacher").value == "teacher"
    assert repository.get_user_role("user-1").value == "teacher"


def test_supabase_role_repository_does_not_create_missing_profiles(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    repository = SupabaseRoleRepository(client=FakeSupabaseClient({"profiles": []}))

    with pytest.raises(LookupError, match="User profile not found"):
        repository.set_user_role("missing-user", "admin")


def test_supabase_role_repository_rejects_inactive_accounts(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    repository = SupabaseRoleRepository(client=FakeSupabaseClient({
        "profiles": [{"id": "disabled-user", "role": "admin", "is_active": False}],
    }))

    with pytest.raises(InactiveAccountError):
        repository.get_user_role("disabled-user")


def test_database_service_does_not_fake_success_when_write_is_not_confirmed():
    class NoResultTable:
        def insert(self, _payload):
            return self

        def select(self, _columns):
            return self

        def execute(self):
            return type("Response", (), {"data": []})()

    class NoResultClient:
        def table(self, _name):
            return NoResultTable()

    service = DatabaseService(client=NoResultClient())

    with pytest.raises(RuntimeError, match="did not confirm the persisted submission"):
        service.create_submission({"user_id": "user-1", "source_code": "print(1)"})


def test_admin_dashboard_metrics_use_exact_database_counts():
    client = FakeSupabaseClient({
        "profiles": [
            {"id": "student-1", "role": "student"},
            {"id": "student-2", "role": "student"},
            {"id": "teacher-1", "role": "teacher"},
        ],
        "problems": [
            {"id": "published-1", "is_published": True},
            {"id": "draft-1", "is_published": False},
        ],
        "submissions": [{"id": "submission-1"}, {"id": "submission-2"}],
        "courses": [{"id": "course-1", "is_published": True}],
    })
    service = DatabaseService(client=client)

    assert service.get_admin_dashboard_metrics() == {
        "total_users": 3,
        "students": 2,
        "teachers": 1,
        "published_problems": 1,
        "submissions": 2,
        "published_courses": 1,
    }


def test_teacher_course_enrollment_count_includes_only_active_rows():
    client = FakeSupabaseClient({
        "course_enrollments": [
            {"id": "active-1", "course_id": "course-1", "enrollment_status": "active"},
            {"id": "active-2", "course_id": "course-1", "enrollment_status": "active"},
            {"id": "paused", "course_id": "course-1", "enrollment_status": "paused"},
            {"id": "other-course", "course_id": "course-2", "enrollment_status": "active"},
        ],
    })
    service = DatabaseService(client=client)

    assert service.count_active_course_enrollments("course-1") == 2


def test_problem_queries_do_not_select_hidden_test_cases():
    client = FakeSupabaseClient({
        "problems": [{
            "id": "problem-1",
            "title": "Public problem",
            "is_published": True,
            "hidden_test_cases": [{"input": "secret", "expected_output": "private"}],
        }],
    })
    service = DatabaseService(client=client)

    problem = service.get_problem("problem-1")
    problems = service.list_problems()

    assert problem == {"id": "problem-1", "title": "Public problem", "is_published": True}
    assert problems == [{"id": "problem-1", "title": "Public problem", "is_published": True}]


def test_database_service_reads_learning_submissions_for_the_requested_user():
    client = FakeSupabaseClient({
        "submissions": [
            {"user_id": "user-1", "problem_id": "problem-1", "status": "passed", "language": "python"},
            {"user_id": "user-2", "problem_id": "problem-2", "status": "failed", "language": "cpp"},
        ],
    })
    service = DatabaseService(client=client)

    submissions = service.list_learning_submissions("user-1", limit=10)

    assert len(submissions) == 1
    assert submissions[0]["problem_id"] == "problem-1"


def test_database_service_reads_test_cases_only_for_requested_problem():
    client = FakeSupabaseClient({
        "problem_test_cases": [
            {"problem_id": "problem-1", "input_text": "private", "expected_output": "private-result", "is_hidden": True},
            {"problem_id": "problem-2", "input_text": "other", "expected_output": "other-result", "is_hidden": False},
        ],
    })
    service = DatabaseService(client=client)

    cases = service.list_problem_test_cases("problem-1", limit=10)

    assert cases == [{
        "input_text": "private",
        "expected_output": "private-result",
        "is_hidden": True,
    }]


def test_database_service_public_problem_samples_exclude_hidden_cases():
    client = FakeSupabaseClient({
        "problem_test_cases": [
            {"id": "sample", "problem_id": "problem-1", "name": "Sample", "input_text": "public", "expected_output": "ok", "is_hidden": False},
            {"id": "hidden", "problem_id": "problem-1", "name": "Hidden", "input_text": "private", "expected_output": "secret", "is_hidden": True},
        ],
    })
    service = DatabaseService(client=client)

    samples = service.list_public_problem_test_cases("problem-1")

    assert samples == [{
        "id": "sample",
        "name": "Sample",
        "input_text": "public",
        "expected_output": "ok",
    }]
    assert "private" not in str(samples)


def test_database_service_reads_persisted_learning_dna_profile():
    client = FakeSupabaseClient({
        "learning_dna_profiles": [{
            "user_id": "user-1",
            "mastery": {"debugging": 61},
            "streak_days": 3,
            "consistency": 0.6,
        }],
    })
    service = DatabaseService(client=client)

    profile = service.get_learning_dna_profile("user-1")

    assert profile["mastery"] == {"debugging": 61}
    assert profile["streak_days"] == 3


def test_daily_plan_task_update_is_scoped_to_its_plan():
    client = FakeSupabaseClient({
        "daily_plan_tasks": [
            {"id": "task-1", "plan_id": "plan-1", "completed": False},
            {"id": "task-2", "plan_id": "plan-2", "completed": False},
        ],
    })
    service = DatabaseService(client=client)

    updated = service.update_daily_plan_task("plan-1", "task-1", True)

    assert updated == {"id": "task-1", "plan_id": "plan-1", "completed": True}
    assert client.table("daily_plan_tasks").rows[1]["completed"] is False
    assert service.update_daily_plan_task("plan-2", "task-1", False) is None


def test_database_service_requires_configuration(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_URL", "")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")

    service = DatabaseService(client=None)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        service._require_client()


@pytest.mark.asyncio
async def test_student_cannot_access_other_profile():
    current_user = UserProfile(id="student-1", email="student@example.com", role=UserRole.STUDENT)

    with pytest.raises(HTTPException) as exc:
        await get_profile("student-2", current_user=current_user)

    assert exc.value.status_code == 403
    assert "Students can only read their own profile" in exc.value.detail
