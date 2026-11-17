import pytest

from backend.app.core import judge0
from backend.app.core.config import settings


def test_judge0_payload_supports_configured_languages():
    assert judge0.build_judge0_payload(" Python ", "print(1)") == {
        "language_id": 71,
        "source_code": "print(1)",
        "stdin": "",
        **judge0.JUDGE0_RESOURCE_LIMITS,
    }
    assert judge0.build_judge0_payload("javascript", "console.log(1)")["language_id"] == 63
    assert judge0.build_judge0_payload("cpp", "int main() {}")["language_id"] == 54


@pytest.mark.parametrize(
    ("description", "expected"),
    [
        ("Accepted", "accepted"),
        ("Wrong Answer", "wrong_answer"),
        ("Compilation Error", "compilation_error"),
        ("Runtime Error (SIGSEGV)", "runtime_error"),
        ("Time Limit Exceeded", "time_limit_exceeded"),
        ("Memory Limit Exceeded", "memory_limit_exceeded"),
        ("Internal Error", "error"),
    ],
)
def test_judge0_terminal_status_mapping(description, expected):
    assert judge0._map_status(description) == expected


@pytest.mark.asyncio
async def test_judge0_sends_auth_token_using_ce_header(monkeypatch):
    requests = []

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"token": "submission-token"}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url, json, headers, timeout):
            requests.append((url, json, headers, timeout))
            return FakeResponse()

    monkeypatch.setattr(settings, "JUDGE0_API_URL", "https://judge0.example.test")
    monkeypatch.setattr(settings, "JUDGE0_AUTH_TOKEN", "test-auth-token")
    monkeypatch.setattr(judge0.httpx, "AsyncClient", FakeClient)

    result = await judge0._request_submission({"language_id": 71, "source_code": "print(1)", "stdin": ""})

    assert result == {"token": "submission-token"}
    assert requests[0][2]["X-Auth-Token"] == "test-auth-token"
    assert "Authorization" not in requests[0][2]


@pytest.mark.asyncio
async def test_poll_returns_completed_judge0_status_without_waiting(monkeypatch):
    statuses = iter([
        {"status": {"id": 1, "description": "In Queue"}},
        {"status": {"id": 2, "description": "Processing"}},
        {"status": {"id": 6, "description": "Compilation Error"}, "compile_output": "compiler output"},
    ])

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return next(statuses)

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, *_args, **_kwargs):
            return FakeResponse()

    async def no_wait(_seconds):
        return None

    monkeypatch.setattr(settings, "JUDGE0_API_URL", "https://judge0.example.test")
    monkeypatch.setattr(judge0.httpx, "AsyncClient", FakeClient)
    monkeypatch.setattr(judge0.asyncio, "sleep", no_wait)

    result = await judge0._poll_submission("safe-test-token", timeout_seconds=2)

    assert result["status"]["id"] == 6
    assert result["compile_output"] == "compiler output"


@pytest.mark.asyncio
async def test_execute_code_maps_runtime_error_and_keeps_provider_error_private(monkeypatch):
    monkeypatch.setattr(settings, "JUDGE0_API_URL", "https://judge0.example.test")

    async def request_submission(payload):
        assert payload["language_id"] == 71
        return {"token": "safe-test-token"}

    async def poll_submission(_token, timeout_seconds):
        assert timeout_seconds == 20
        return {"status": {"description": "Runtime Error (NZEC)"}, "stderr": "program failed"}

    monkeypatch.setattr(judge0, "_request_submission", request_submission)
    monkeypatch.setattr(judge0, "_poll_submission", poll_submission)

    result = await judge0.execute_code("python", "print(1)")
    assert result["status"] == "runtime_error"

    async def failed_request(_payload):
        raise RuntimeError("sensitive provider details")

    monkeypatch.setattr(judge0, "_request_submission", failed_request)
    failed = await judge0.execute_code("python", "print(1)")
    assert failed["status"] == "error"
    assert "sensitive provider details" not in failed["message"]


@pytest.mark.asyncio
async def test_unconfigured_judge0_is_not_reported_as_wrong_answer(monkeypatch):
    monkeypatch.setattr(settings, "JUDGE0_API_URL", "")

    result = await judge0.execute_code("python", "print(1)")

    assert result["status"] == "unconfigured"
    assert result["configured"] is False


@pytest.mark.asyncio
async def test_judge0_http_timeout_is_not_reported_as_code_time_limit(monkeypatch):
    monkeypatch.setattr(settings, "JUDGE0_API_URL", "https://judge0.example.test")

    async def timeout(_payload):
        raise judge0.httpx.TimeoutException("provider timeout")

    monkeypatch.setattr(judge0, "_request_submission", timeout)
    result = await judge0.execute_code("python", "print(1)")

    assert result["status"] == "error"
    assert "time limit exceeded" not in result["message"].lower()
