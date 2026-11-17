import pytest
from fastapi import HTTPException

from backend.app.api.v1.endpoints.platform import get_profile
from backend.app.core.config import settings
from backend.app.core.database import DatabaseService
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

    def select(self, *_args, **_kwargs):
        self.filters = []
        self.single = False
        self.limit_value = None
        self.order_value = None
        self.method = None
        return self

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
                if self.filters:
                    for row in self.rows:
                        if row.get(self.filters[0][0]) == self.filters[0][1]:
                            row.update(self.payload)
                            result = [row]
                            break
                    else:
                        result = []
                else:
                    result = []
                self.method = None
                return type("Response", (), {"data": result})()

            if self.single:
                for row in self.rows:
                    if all(row.get(key) == value for key, value in self.filters):
                        self.method = None
                        return type("Response", (), {"data": row})()
                self.method = None
                return type("Response", (), {"data": None})()

            if self.order_value:
                result = list(self.rows)
                if self.limit_value:
                    result = result[: self.limit_value]
                self.method = None
                return type("Response", (), {"data": result})()

            if self.limit_value:
                result = list(self.rows)[: self.limit_value]
            else:
                result = list(self.rows)
            self.method = None
            return type("Response", (), {"data": result})()
        finally:
            self.filters = []
            self.single = False
            self.limit_value = None
            self.order_value = None


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
