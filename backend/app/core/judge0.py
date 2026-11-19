from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

JUDGE0_LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "cpp": 54,
}
JUDGE0_RESOURCE_LIMITS = {
    "cpu_time_limit": 5,
    "wall_time_limit": 10,
    "memory_limit": 128_000,
    "max_output": 1_024,
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
PENDING_JUDGE0_STATUS_IDS = {1, 2}


def _request_headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.JUDGE0_AUTH_TOKEN:
        headers["X-Auth-Token"] = settings.JUDGE0_AUTH_TOKEN
    return headers


def validate_language(language: str) -> Optional[str]:
    target = (language or "python").strip().lower()
    return target if target in JUDGE0_LANGUAGE_IDS else None


def build_judge0_payload(language: str, source_code: str, stdin: str = "") -> Dict[str, Any]:
    normalized = validate_language(language)
    if normalized is None:
        raise ValueError(f"Unsupported language: {language}")
    return {
        "language_id": JUDGE0_LANGUAGE_IDS[normalized],
        "source_code": source_code,
        "stdin": stdin,
        **JUDGE0_RESOURCE_LIMITS,
    }


async def _request_submission(payload: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(trust_env=False) as client:
        response = await client.post(
            f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions/?base64_encoded=false",
            json=payload,
            headers=_request_headers(),
            timeout=20,
        )
        response.raise_for_status()
        return response.json()


async def _poll_submission(token: str, timeout_seconds: int = 20) -> Dict[str, Any]:
    async with httpx.AsyncClient(trust_env=False) as client:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            response = await client.get(
                f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions/{token}?base64_encoded=false",
                headers=_request_headers(),
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            status_info = data.get("status")
            status_id = status_info.get("id") if isinstance(status_info, dict) else None
            if status_id in PENDING_JUDGE0_STATUS_IDS:
                await asyncio.sleep(0.4)
                continue
            if not isinstance(status_id, int):
                raise RuntimeError("Judge0 returned a malformed execution status.")
            return data
        raise TimeoutError("Judge0 did not complete before the polling deadline.")


def _map_status(description: str) -> str:
    normalized = description.strip().lower()
    if normalized.startswith("runtime error"):
        return "runtime_error"
    return VALID_JUDGE0_STATUSES.get(normalized, "error")


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
            "message": "Judge0 is not configured. Set JUDGE0_API_URL in backend/.env.",
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
        status_info = result.get("status")
        status_description = status_info.get("description", "") if isinstance(status_info, dict) else ""
        status_description = str(status_description).strip()
        mapped_status = _map_status(status_description)
        return {
            "status": mapped_status,
            "configured": True,
            "language": target_language,
            "stdout": result.get("stdout") or "",
            "stderr": result.get("stderr") or "",
            "compile_output": result.get("compile_output") or "",
            "message": status_description or "Execution completed.",
            "execution_id": str(token),
            "execution_time_ms": result.get("time") and int(float(result.get("time", 0)) * 1000),
            "memory_kb": result.get("memory"),
        }
    except (httpx.TimeoutException, TimeoutError):
        logger.warning("Judge0 execution timed out before returning a result.")
        return {
            "status": "error",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "Judge0 did not return a result before the backend timeout.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }
    except httpx.ConnectError:
        logger.warning("The configured Judge0 service could not be reached.")
        return {
            "status": "error",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "The configured Judge0 service could not be reached. Check that it is running.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }
    except (httpx.HTTPError, RuntimeError, ValueError, TypeError, KeyError):
        logger.exception("Judge0 execution failed.")
        return {
            "status": "error",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "The Judge0 execution service returned an error.",
            "execution_id": None,
            "execution_time_ms": None,
            "memory_kb": None,
        }
