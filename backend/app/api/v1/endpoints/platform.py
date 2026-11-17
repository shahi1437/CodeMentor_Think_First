from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.core.ai_mentor import generate_mentor_response
from backend.app.core.database import get_database_service
from backend.app.core.judge0 import execute_code
from backend.app.core.learning_dna import summarize_learning_dna
from backend.app.core.ml_classifier import ErrorClassifier
from backend.app.core.auth import get_current_user, require_student, require_teacher
from backend.app.schemas.auth import UserProfile, UserRole
from backend.app.schemas.platform import (
    ErrorPredictionRequest,
    ErrorPredictionResponse,
    ExecuteRequest,
    ExecuteResponse,
    LearningDNAResponse,
    MentorRequest,
    MentorResponse,
)

router = APIRouter(prefix="/platform", tags=["Platform services"])


@router.get("/status")
async def platform_status(current_user: UserProfile = Depends(get_current_user)):
    database = get_database_service()
    return {
        "status": "ok",
        "user": current_user.email,
        "role": current_user.role.value,
        "database": "configured" if database.configured else "missing_config",
        "judge0": "configured" if bool(current_user.id) else "ready",
    }


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role == UserRole.STUDENT and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only read their own profile.")
    database = get_database_service()
    profile = database.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    return profile


@router.post("/execute", response_model=ExecuteResponse)
async def execute_platform_code(payload: ExecuteRequest, current_user: UserProfile = Depends(require_student)):
    result = await execute_code(payload.language, payload.source_code, payload.stdin)
    return ExecuteResponse(
        status=result.get("status", "error"),
        configured=result.get("configured", False),
        language=result.get("language", payload.language),
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
        compile_output=result.get("compile_output", ""),
        message=result.get("message", "Execution completed."),
        execution_id=result.get("execution_id"),
    )


@router.post("/classify-error", response_model=ErrorPredictionResponse)
async def classify_error(payload: ErrorPredictionRequest, current_user: UserProfile = Depends(require_student)):
    prediction = ErrorClassifier.predict_error(payload.code, payload.language)
    return ErrorPredictionResponse(
        label=str(prediction["label"]),
        confidence=float(prediction["confidence"]),
        reasons=list(prediction.get("reasons", [])),
        message=prediction.get("message", "Classification complete."),
    )


@router.post("/mentor", response_model=MentorResponse)
async def mentor_chat(payload: MentorRequest, current_user: UserProfile = Depends(require_student)):
    response = await generate_mentor_response(payload.question, payload.topic, payload.student_context)
    return MentorResponse(
        answer=str(response.get("answer", "No guidance available.")),
        source=str(response.get("source", "local_guidance")),
        safe_mode=bool(response.get("safe_mode", True)),
    )


@router.get("/learning-dna", response_model=LearningDNAResponse)
async def learning_dna(current_user: UserProfile = Depends(require_student)):
    summary = summarize_learning_dna(current_user.id)
    return LearningDNAResponse(
        user_id=summary["user_id"],
        mastery=summary["mastery"],
        streak_days=summary["streak_days"],
        consistency=summary["consistency"],
        daily_plan=summary["daily_plan"],
    )


@router.get("/dashboard-summary")
async def dashboard_summary(current_user: UserProfile = Depends(require_teacher)):
    return {
        "status": "ok",
        "role": current_user.role.value,
        "metrics": {
            "active_students": 128,
            "problems_solved": 834,
            "bug_resolution_rate": 0.87,
        },
        "alerts": ["Two students need support on recursion diagnostics.", "Follow-up quiz unlocks in 3 hours."],
    }
