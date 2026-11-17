from __future__ import annotations

from typing import Any, Dict

import httpx

from backend.app.core.config import settings


JUDGE0_LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "cpp": 54,
}


async def execute_code(language: str, source_code: str, stdin: str = "") -> Dict[str, Any]:
    target_language = (language or "python").lower()
    language_id = JUDGE0_LANGUAGE_IDS.get(target_language)
    if not settings.JUDGE0_API_URL or language_id is None:
        return {
            "status": "unconfigured",
            "configured": False,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": "Judge0 is not configured. Set JUDGE0_API_URL and JUDGE0_AUTH_TOKEN to enable execution.",
        }

    payload = {
        "language_id": language_id,
        "source_code": source_code,
        "stdin": stdin,
    }

    headers = {"Content-Type": "application/json"}
    if settings.JUDGE0_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {settings.JUDGE0_AUTH_TOKEN}"

    try:
        response = httpx.post(
            f"{settings.JUDGE0_API_URL.rstrip('/')}/submissions/?base64_encoded=false&wait=true",
            json=payload,
            headers=headers,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        stdout = data.get("stdout") or ""
        stderr = data.get("stderr") or ""
        compile_output = data.get("compile_output") or ""
        return {
            "status": "success" if str(data.get("status", {}).get("description", "")).lower() in {"accepted", "completed"} else "runtime_error",
            "configured": True,
            "language": target_language,
            "stdout": stdout,
            "stderr": stderr,
            "compile_output": compile_output,
            "message": data.get("status", {}).get("description") or "Execution completed.",
            "execution_id": data.get("token") or data.get("id"),
        }
    except Exception as exc:  # pragma: no cover - network integration safety
        return {
            "status": "error",
            "configured": True,
            "language": target_language,
            "stdout": "",
            "stderr": "",
            "compile_output": "",
            "message": f"Execution service error: {exc}",
        }
