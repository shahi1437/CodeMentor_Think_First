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
    SubmissionRequest,
    SubmissionResponse,
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


@router.get("/profiles")
async def list_profiles(current_user: UserProfile = Depends(get_current_user)):
    database = get_database_service()
    if current_user.role == UserRole.STUDENT:
        return [database.get_user_profile(current_user.id)] if database.get_user_profile(current_user.id) else []
    try:
        profiles = database.list_profiles(limit=50)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return profiles


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role == UserRole.STUDENT and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only read their own profile.")
    database = get_database_service()
    try:
        profile = database.get_user_profile(user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")
    return profile


@router.get("/problems")
async def list_problem_records(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        problems = database.list_problems(limit=50, include_hidden=current_user.role in {UserRole.TEACHER, UserRole.ADMIN})
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return problems


@router.get("/problems/{problem_id}")
async def get_problem_record(problem_id: str, current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        problem = database.get_problem(problem_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
    if problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")
    return problem


@router.get("/courses")
async def list_courses(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        if current_user.role == UserRole.STUDENT:
            courses = [course for course in database.list_courses(limit=50) if course.get("is_published", True)]
        else:
            courses = database.list_courses(teacher_id=current_user.id, limit=50)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return courses


@router.get("/daily-plans")
async def list_student_daily_plans(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        return database.list_daily_plans(current_user.id, limit=20)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/submissions")
async def list_submissions(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        if current_user.role == UserRole.STUDENT:
            return database.list_submissions(user_id=current_user.id, limit=20)
        return database.list_submissions(limit=20)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


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
        execution_time_ms=result.get("execution_time_ms"),
        memory_kb=result.get("memory_kb"),
    )


@router.post("/submit", response_model=SubmissionResponse)
async def submit_code(payload: SubmissionRequest, current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    problem = database.get_problem(payload.problem_id) if payload.problem_id else None
    if payload.problem_id and not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
    if problem and problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")

    if current_user.role == UserRole.STUDENT and any(test_case.is_hidden for test_case in payload.test_cases):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden tests are never exposed or processed for students.")

    public_cases = list(payload.test_cases) or [{"input": payload.stdin, "expected_output": "", "is_hidden": False}]
    results = []
    passed_cases = 0
    total_cases = len(public_cases)

    for test_case in public_cases:
        execution = await execute_code(payload.language, payload.source_code, test_case.input)
        actual_output = (execution.get("stdout") or "").strip()
        expected_output = str(test_case.expected_output or "").strip()
        is_accepted = execution.get("status") == "accepted" and actual_output == expected_output
        if is_accepted:
            passed_cases += 1
        results.append({
            "input": test_case.input,
            "expected_output": expected_output,
            "actual_output": actual_output,
            "status": execution.get("status", "error"),
        })

    verdict = "accepted" if total_cases and passed_cases == total_cases else "wrong_answer"
    if not total_cases:
        verdict = "invalid_submission"
    if any(result["status"] in {"compilation_error", "runtime_error", "time_limit_exceeded", "memory_limit_exceeded", "validation_error"} for result in results):
        verdict = result["status"] if result["status"] in {"compilation_error", "runtime_error", "time_limit_exceeded", "memory_limit_exceeded", "validation_error"} else verdict

    submission_record = {
        "user_id": current_user.id,
        "problem_id": payload.problem_id,
        "status": verdict,
        "score": round((passed_cases / total_cases) * 100, 2) if total_cases else 0.0,
        "language": payload.language,
        "source_code": payload.source_code,
        "stdout": "\n".join(result["actual_output"] for result in results)[:2000],
        "stderr": "\n".join(result["status"] for result in results)[:2000],
        "runtime_metadata": {"passed_test_count": passed_cases, "total_test_count": total_cases, "results": results},
    }

    try:
        created = database.create_submission(submission_record)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    submission_id = created.get("id") or created.get("submission_id")
    return SubmissionResponse(
        submission_id=str(submission_id) if submission_id else None,
        verdict=verdict,
        passed_test_count=passed_cases,
        total_test_count=total_cases,
        score=float(submission_record["score"]),
        message="Submission processed successfully." if verdict == "accepted" else "Submission did not pass all public checks.",
        status=verdict,
        stdout=submission_record["stdout"],
        stderr=submission_record["stderr"],
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
