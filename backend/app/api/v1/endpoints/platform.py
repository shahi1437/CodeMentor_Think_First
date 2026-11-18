from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Path, status

from backend.app.core.ai_mentor import (
    MentorConfigurationError,
    MentorProviderError,
    generate_mentor_response,
)
from backend.app.core.database import PUBLIC_PROBLEM_FIELDS, get_database_service
from backend.app.core.config import settings
from backend.app.core.execution_quota import enforce_execution_quota
from backend.app.core.grading import MAX_GRADING_TEST_CASES, grade_cases
from backend.app.core.judge0 import execute_code
from backend.app.core.learning_dna import summarize_learning_dna
from backend.app.core.ml_classifier import ErrorClassifier
from backend.app.core.auth import get_current_user, require_admin, require_student, require_teacher
from backend.app.schemas.auth import UserProfile, UserRole
from backend.app.schemas.platform import (
    ErrorPredictionRequest,
    ErrorPredictionResponse,
    DailyPlanTaskUpdate,
    ExecuteRequest,
    ExecuteResponse,
    LearningDNAResponse,
    MentorRequest,
    MentorResponse,
    SubmissionRequest,
    SubmissionResponse,
    TestCaseInput,
)

router = APIRouter(prefix="/platform", tags=["Platform services"])
STUDENT_SUBMISSION_FIELDS = frozenset({
    "id",
    "user_id",
    "problem_id",
    "status",
    "score",
    "language",
    "created_at",
})


def _submission_database_status(verdict: str) -> str:
    if verdict == "accepted":
        return "passed"
    if verdict in {
        "compilation_error",
        "runtime_error",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "validation_error",
        "configuration_error",
        "error",
    }:
        return "error"
    return "failed"


@router.get("/status")
async def platform_status(current_user: UserProfile = Depends(get_current_user)):
    database = get_database_service()
    return {
        "status": "ok",
        "user": current_user.email,
        "role": current_user.role.value,
        "database": "configured" if database.configured else "missing_config",
        "judge0": "configured" if settings.JUDGE0_API_URL else "missing_config",
    }

@router.get("/profiles")
async def list_profiles(current_user: UserProfile = Depends(get_current_user)):
    database = get_database_service()
    if current_user.role == UserRole.STUDENT:
        try:
            profile = database.get_user_profile(current_user.id)
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        return [profile] if profile else []
    if current_user.role == UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher profile access requires an authorized course scope.",
        )
    try:
        profiles = database.list_profiles(limit=50)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return profiles


@router.get("/profile/{user_id}")
async def get_profile(user_id: str, current_user: UserProfile = Depends(get_current_user)):
    if current_user.role == UserRole.STUDENT and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only read their own profile.")
    if current_user.role == UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher profile access requires an authorized course scope.",
        )
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
    return [
        {key: value for key, value in problem.items() if key in PUBLIC_PROBLEM_FIELDS}
        for problem in problems if not problem.get("archived_at")
    ]


@router.get("/problems/{problem_id}")
async def get_problem_record(problem_id: str, current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        problem = database.get_problem(problem_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not problem or problem.get("archived_at"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
    if problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")
    record = {key: value for key, value in problem.items() if key in PUBLIC_PROBLEM_FIELDS}
    if (
        problem.get("is_published") and problem.get("problem_mode") in {"debugging", "both"}
        and problem.get("verified_revision") and problem["verified_revision"] == problem.get("revision")
    ):
        record["debugging_starter_code"] = problem.get("debugging_starter_code", {})
    return record


@router.get("/problems/{problem_id}/samples")
async def list_public_problem_samples(problem_id: str, current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        problem = database.get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
        if problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")
        return database.list_public_problem_test_cases(problem_id, limit=10)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/problems/{problem_id}/hints/{tier}")
async def get_progressive_problem_hint(
    problem_id: str,
    tier: int = Path(ge=1, le=4),
    current_user: UserProfile = Depends(require_student),
):
    database = get_database_service()
    try:
        problem = database.get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
        if problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")
        if problem.get("problem_mode") not in {"debugging", "both"}:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This problem has no debugging hints.")
        requested_tiers = database.list_problem_hint_progress(current_user.id, problem_id)
        next_tier = next((candidate for candidate in range(1, 5) if candidate not in requested_tiers), 5)
        if tier not in requested_tiers and tier != next_tier:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request the previous hint tier before continuing.",
            )
        hints = database.list_problem_hints(problem_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if len(hints) < tier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This hint is not configured.")
    if tier not in requested_tiers:
        try:
            database.record_problem_hint_tier(current_user.id, problem_id, tier)
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"tier": tier, "hint": hints[tier - 1]}


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
        plans = database.list_daily_plans(current_user.id, limit=20)
        return [
            {**plan, "tasks": database.list_daily_plan_tasks(str(plan["id"]))}
            for plan in plans
        ]
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/daily-plans/{plan_id}/tasks/{task_id}")
async def update_student_daily_plan_task(
    plan_id: str,
    task_id: str,
    payload: DailyPlanTaskUpdate,
    current_user: UserProfile = Depends(require_student),
):
    database = get_database_service()
    try:
        plan = database.get_daily_plan(plan_id, current_user.id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily plan not found.")
        task = database.update_daily_plan_task(plan_id, task_id, payload.completed)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this daily plan.")
    return task


@router.get("/submissions")
async def list_submissions(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    try:
        if current_user.role == UserRole.STUDENT:
            submissions = database.list_submissions(user_id=current_user.id, limit=20)
            return [
                {key: value for key, value in submission.items() if key in STUDENT_SUBMISSION_FIELDS}
                for submission in submissions
                if submission.get("user_id") == current_user.id
            ]
        if current_user.role == UserRole.TEACHER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher submission access requires an authorized course scope.",
            )
        return database.list_submissions(limit=20)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/execute", response_model=ExecuteResponse)
async def execute_platform_code(payload: ExecuteRequest, current_user: UserProfile = Depends(require_student)):
    await enforce_execution_quota(get_database_service(), current_user.id, "run")
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
    try:
        problem = database.get_problem(payload.problem_id) if payload.problem_id else None
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if payload.problem_id and not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found.")
    if problem and problem.get("is_published") is False and current_user.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hidden problems are not available to students.")
    supported_languages = problem.get("supported_languages") if problem else None
    if supported_languages and payload.language not in supported_languages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This problem does not support the selected programming language.",
        )

    if payload.mode != "submit":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Use the execution endpoint for run mode; this endpoint grades submissions.",
        )
    try:
        stored_cases = database.list_problem_test_cases(
            payload.problem_id,
            limit=MAX_GRADING_TEST_CASES + 1,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not stored_cases:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This problem does not have configured test cases and cannot be submitted yet.",
        )
    if len(stored_cases) > MAX_GRADING_TEST_CASES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This problem exceeds the {MAX_GRADING_TEST_CASES}-case grading limit.",
        )

    await enforce_execution_quota(database, current_user.id, "submit")
    grading_cases = [
        TestCaseInput(
            input=test_case.get("input_text") or "",
            expected_output=test_case.get("expected_output") or "",
            is_hidden=bool(test_case.get("is_hidden")),
        )
        for test_case in stored_cases
    ]
    if problem and problem.get("revision") is not None:
        try:
            latest = database.get_problem(payload.problem_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail="The problem could not be rechecked.") from exc
        if not latest or latest.get("revision") != problem["revision"]:
            raise HTTPException(status_code=409, detail="This problem changed. Reload before submitting.")
    grade = await grade_cases(execute_code, payload.language, payload.source_code, grading_cases)
    verdict = grade.verdict
    passed_cases = grade.passed
    total_cases = grade.total

    submission_record = {
        "user_id": current_user.id,
        "problem_id": payload.problem_id,
        "status": _submission_database_status(verdict),
        "score": grade.score,
        "language": payload.language,
        "source_code": payload.source_code,
        "stdout": "",
        "stderr": "",
        "runtime_metadata": {
            "verdict": verdict,
            "passed_test_count": passed_cases,
            "total_test_count": total_cases,
            "results": grade.statuses,
        },
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
        message=(
            "All configured problem tests passed."
            if verdict == "accepted"
            else "The execution service is not configured."
            if verdict == "configuration_error"
            else "Submission did not pass all configured problem tests."
        ),
        status=verdict,
        stdout="",
        stderr="",
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
    database = get_database_service()
    learning_context = payload.student_context
    if database.configured:
        learning_dna = database.get_learning_dna_profile(current_user.id)
        if learning_dna:
            learning_context = (
                f"Persisted Learning DNA: mastery={learning_dna.get('mastery', {})}; "
                f"streak_days={learning_dna.get('streak_days', 0)}; "
                f"consistency={learning_dna.get('consistency', 0)}."
            )

    try:
        response = await generate_mentor_response(
            payload.question,
            payload.topic,
            learning_context,
            payload.mode,
            [message.model_dump() for message in payload.history],
        )
    except MentorConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except MentorProviderError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return MentorResponse(
        answer=str(response["answer"]),
        source=str(response["source"]),
        safe_mode=bool(response["safe_mode"]),
    )


@router.get("/learning-dna", response_model=LearningDNAResponse)
async def learning_dna(current_user: UserProfile = Depends(require_student)):
    database = get_database_service()
    if not database.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learning DNA requires a configured Supabase database.",
        )
    try:
        submissions = database.list_learning_submissions(current_user.id, limit=500)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    summary = summarize_learning_dna(current_user.id, submissions)
    return LearningDNAResponse(
        user_id=summary["user_id"],
        mastery=summary["mastery"],
        streak_days=summary["streak_days"],
        consistency=summary["consistency"],
        daily_plan=summary["daily_plan"],
        submission_count=summary["submission_count"],
        accepted_submission_count=summary["accepted_submission_count"],
        problems_solved=summary["problems_solved"],
        error_categories=summary["error_categories"],
        activity_days=summary["activity_days"],
        has_data=summary["has_data"],
    )


@router.get("/dashboard-summary")
async def dashboard_summary(current_user: UserProfile = Depends(require_teacher)):
    database = get_database_service()
    if not database.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Teacher course summaries require a configured Supabase database.",
        )
    try:
        courses = database.list_courses(teacher_id=current_user.id, limit=50)
        summaries = [
            {
                "id": course["id"],
                "title": course["title"],
                "code": course.get("code"),
                "description": course.get("description"),
                "is_published": bool(course.get("is_published")),
                "active_enrollment_count": database.count_active_course_enrollments(str(course["id"])),
            }
            for course in courses
        ]
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"courses": summaries}


@router.get("/admin/dashboard-summary")
async def admin_dashboard_summary(current_user: UserProfile = Depends(require_admin)):
    database = get_database_service()
    if not database.configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrator metrics require a configured Supabase database.",
        )
    try:
        metrics = database.get_admin_dashboard_metrics()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return {
        "metrics": metrics,
        "integrations": {
            "database": "configured",
            "judge0": "configured" if settings.JUDGE0_API_URL else "missing_config",
            "llm": "configured" if settings.LLM_API_URL and settings.LLM_API_KEY else "missing_config",
        },
    }
