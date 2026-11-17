from __future__ import annotations

import os
from typing import Dict, Optional

import httpx

from backend.app.core.config import settings


def _safe_fallback(question: str, topic: str) -> Dict[str, str | bool]:
    return {
        "answer": (
            f"Here is a Socratic prompt for {topic}: "
            f"What is the expected value in this step, and which line changes that value? "
            f"Trace the exact data flow behind '{question[:120]}'."
        ),
        "source": "local_guidance",
        "safe_mode": True,
    }


async def generate_mentor_response(question: str, topic: str = "debugging", student_context: str = "") -> Dict[str, str | bool]:
    if not settings.LLM_API_KEY or not settings.LLM_API_URL:
        return _safe_fallback(question, topic)

    payload = {
        "model": settings.LLM_MODEL or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a mentoring tutor for CodeMentor AI. Be clear, structured, and Socratic. Do not reveal hidden tests or unsafe guidance."},
            {"role": "user", "content": f"Topic: {topic}\nContext: {student_context}\nQuestion: {question}"},
        ],
    }

    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(settings.LLM_API_URL, headers=headers, json=payload, timeout=25)
        response.raise_for_status()
        data = response.json()
        answer = data.get("choices", [{}])[0].get("message", {}).get("content")
        if answer:
            return {"answer": answer.strip(), "source": "live_llm", "safe_mode": False}
    except Exception:
        pass

    return _safe_fallback(question, topic)
