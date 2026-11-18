from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from typing import Any

from backend.app.schemas.platform import TestCaseInput

MAX_GRADING_TEST_CASES = 100
PROVIDER_FAILURES = {"unconfigured", "error"}
FAILURE_VERDICTS = PROVIDER_FAILURES | {
    "compilation_error", "runtime_error", "time_limit_exceeded",
    "memory_limit_exceeded", "validation_error",
}
Executor = Callable[[str, str, str], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class GradingResult:
    passed: int
    total: int
    statuses: list[dict[str, str]]

    @property
    def verdict(self) -> str:
        statuses = [result["status"] for result in self.statuses]
        for provider_failure in ("unconfigured", "error"):
            if provider_failure in statuses:
                return "configuration_error" if provider_failure == "unconfigured" else "error"
        for execution_status in statuses:
            if execution_status in FAILURE_VERDICTS:
                return execution_status
        return "accepted" if self.passed == self.total else "wrong_answer"

    @property
    def score(self) -> float:
        return round(self.passed * 100 / self.total, 2)


async def grade_cases(
    executor: Executor, language: str, source_code: str, cases: Sequence[TestCaseInput],
) -> GradingResult:
    if not 1 <= len(cases) <= MAX_GRADING_TEST_CASES:
        raise ValueError("The grading harness requires a bounded, nonempty set of cases.")
    statuses = []
    passed = 0
    for case in cases:
        execution = await executor(language, source_code, case.input)
        execution_status = execution.get("status", "error")
        actual = (execution.get("stdout") or "").strip()
        passed += int(execution_status == "accepted" and actual == case.expected_output.strip())
        statuses.append({"status": execution_status})
        if execution_status in PROVIDER_FAILURES:
            break
    return GradingResult(passed, len(cases), statuses)
