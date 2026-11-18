from typing import Literal

from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool

from backend.app.core.config import SupabaseConfigurationError, settings
from backend.app.core.database import DatabaseService


async def enforce_execution_quota(
    database: DatabaseService, user_id: str, action: Literal["run", "submit", "mentor"],
) -> None:
    limit = {
        "run": settings.EXECUTION_RUN_LIMIT,
        "submit": settings.EXECUTION_SUBMIT_LIMIT,
        "mentor": settings.MENTOR_REQUEST_LIMIT,
    }[action]
    try:
        retry_after = await run_in_threadpool(
            database.consume_execution_quota, user_id, action, limit, settings.EXECUTION_RATE_WINDOW_SECONDS,
        )
    except SupabaseConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=("The Mentor request limit is temporarily unavailable. Try again shortly."
                    if action == "mentor" else "The execution limit is temporarily unavailable. Try again shortly."),
        ) from exc

    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You reached your {action} limit. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
