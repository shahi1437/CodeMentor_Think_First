from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from backend.app.core.config import settings


JUDGE0_LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "cpp": 54,
}

VALID_JUDGE0_STATUSES = {
    "accepted": "accepted",
    "wrong answer": "wrong_answer",
    "time limit exceeded": "time_limit_exceeded",
    "compilation error": "compilation_error",
    "runtime error": "runtime_error",
    "memory limit exceeded": "memory_limit_exceeded",
    "internal error": "error",
}


def validate_language(language: str) -> Optional[str]:
    target = (language or "python").lower()
    return target if target in JUDGE0_LANGUAGE_IDS else None


def build_judge0_payload(language: str, source_code: str, stdin: str = "") -> Dict[str, Any]:
    normalized = validate_language(language)
    if normalized is None:
        raise ValueError(f"Unsupported language: {language}")
    return {
        "language_id": JUDGE0_LANGUAGE_IDS[normalized],
        "source_code": source_code,
        "stdin": stdin,
    }


async def _request_submission(payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if settings.JUDGE0_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {settings.JUDGE0_AUTH_TOKEN}"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions/?base64_encoded=false",
            json=payload,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        return response.json()


async def _poll_submission(token: str, timeout_seconds: int = 20) -> Dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if settings.JUDGE0_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {settings.JUDGE0_AUTH_TOKEN}"
    async with httpx.AsyncClient() as client:
        deadline = __import__("time").time() + timeout_seconds
        while __import__("time").time() < deadline:
            response = await client.get(
                f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions/{token}?base64_encoded=false",
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            status_id = data.get("status", {}).get("id")
            if status_id in {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}:
                await __import__("asyncio").sleep(0.4)
                continue
            return data
        raise TimeoutError("Judge0 execution timed out while polling for a result.")


async def execute_code(language: str, source_code: str, stdin: str = "") -> Dict[str, Any]:
    target_language = validate_language(language)
    if target_language is None:
        return {
            "status": "validation_error",
            "configured": False,
            "language": (language or "python").lower(),
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": f"Unsupported language: {language}. Supported languages are: python, javascript, cpp.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }

    if not source_code or not source_code.strip():
        return {
            "status": "validation_error",
            "configured": False,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "Submission is empty. Please provide source code before running or submitting.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }

    if not settings.JUDGE0_API_URL:
        return {
            "status": "unconfigured",
            "configured": False,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "Judge0 is not configured. Set JUDGE0_API_URL and JUDGE0_AUTH_TOKEN to enable execution.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }

    payload = build_judge0_payload(target_language, source_code, stdin)
    try:
        submitted = await _request_submission(payload)
        token = submitted.get("token") or submitted.get("id")
        if not token:
            raise RuntimeError("Judge0 did not return a submission token.")
        result = await _poll_submission(str(token), timeout_seconds=20)
        status = str(result.get("status", {}).get("description", "")).strip()
        mapped_status = VALID_JUDGE0_STATUSES.get(status.lower(), "error")
        return {
            "status": mapped_status,
            "configured": True,
            "language": target_language,
            "stdout": result.get("stdout") or "",
            "stderr": result.get("stderr") or "",
            "compile_output": result.get("compile_output") or "",
            "message": status or "Execution completed.",
            "execution_id": str(token),
            "execution_time_ms": result.get("time") and int(float(result.get("time", 0)) * 1000),
            "memory_kb": result.get("memory"),
        }
    except httpx.TimeoutException:
        return {
            "status": "time_limit_exceeded",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "Judge0 timed out while processing the request.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }
    except Exception as exc:
        return {
            "status": "error",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": f"Execution service error: {exc}",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }
