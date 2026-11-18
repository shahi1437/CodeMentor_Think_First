import math
from typing import Annotated

import httpx
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints

from backend.app.core.ai_mentor import MentorConfigurationError, MentorProviderError
from backend.app.core.config import settings

CurriculumLabel = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
CurriculumText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=6000)]


class CurriculumChunk(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: CurriculumLabel
    content: CurriculumText
    license: CurriculumLabel
    source_url: HttpUrl
    public_curriculum_confirmed: bool = Field(..., description="Licensed public curriculum without student data or grading material.")


async def embed_text(text: str) -> list[float]:
    api_key = settings.LLM_EMBEDDING_API_KEY or settings.LLM_API_KEY
    if not settings.LLM_EMBEDDING_URL or not api_key or not settings.LLM_EMBEDDING_MODEL:
        raise MentorConfigurationError("Curriculum embeddings are not configured.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
            response = await client.post(
                settings.LLM_EMBEDDING_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": settings.LLM_EMBEDDING_MODEL, "input": text},
            )
            response.raise_for_status()
            values = response.json()["data"][0]["embedding"]
        if len(values) != 1536 or not all(type(value) in {int, float} and math.isfinite(value) for value in values):
            raise ValueError("Invalid embedding dimensions or values")
        if not any(values):
            raise ValueError("Embedding must be nonzero")
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as exc:
        raise MentorProviderError("The curriculum embedding provider did not return a usable result.") from exc
    return values
