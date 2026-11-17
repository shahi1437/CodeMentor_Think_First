from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


def _submission_date(value: Any) -> Optional[date]:
    if isinstance(value, datetime):
        timestamp = value
    elif isinstance(value, str):
        try:
            timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc).date()


def _submission_verdict(submission: Dict[str, Any]) -> str:
    metadata = submission.get("runtime_metadata")
    if isinstance(metadata, dict) and isinstance(metadata.get("verdict"), str):
        return metadata["verdict"]
    legacy_status = str(submission.get("status", "unknown"))
    return {"passed": "accepted", "failed": "wrong_answer"}.get(legacy_status, legacy_status)


def summarize_learning_dna(
    user_id: str,
    submissions: List[Dict[str, Any]],
    today: Optional[date] = None,
) -> Dict[str, Any]:
    today = today or datetime.now(timezone.utc).date()
    language_attempts: Dict[str, List[bool]] = defaultdict(list)
    error_categories: Counter[str] = Counter()
    solved_problem_ids = set()
    activity_dates = set()
    accepted_count = 0

    for submission in submissions:
        verdict = _submission_verdict(submission)
        language = str(submission.get("language") or "unknown").lower()
        accepted = verdict == "accepted"
        language_attempts[language].append(accepted)

        problem_id = submission.get("problem_id")
        if accepted:
            accepted_count += 1
            if problem_id:
                solved_problem_ids.add(str(problem_id))
        else:
            error_categories[verdict] += 1

        activity_date = _submission_date(submission.get("created_at"))
        if activity_date:
            activity_dates.add(activity_date)

    mastery = {
        language: round(sum(attempts) * 100 / len(attempts), 1)
        for language, attempts in sorted(language_attempts.items())
        if attempts
    }

    streak_days = 0
    cursor = today if today in activity_dates else today - timedelta(days=1)
    while cursor in activity_dates:
        streak_days += 1
        cursor -= timedelta(days=1)

    if activity_dates:
        first_activity = min(activity_dates)
        last_activity = max(activity_dates)
        active_span = max(1, (last_activity - first_activity).days + 1)
        consistency = round(len(activity_dates) / active_span, 2)
    else:
        consistency = 0.0

    daily_plan: List[str] = []
    if submissions:
        if mastery:
            weakest_language = min(mastery, key=mastery.get)
            daily_plan.append(
                f"Practice one {weakest_language} problem; your accepted-submission rate in this language is {mastery[weakest_language]}%."
            )
        if error_categories:
            frequent_error = error_categories.most_common(1)[0][0].replace("_", " ")
            daily_plan.append(f"Review a recent {frequent_error} submission and compare its expected and actual behavior.")
        daily_plan.append("Submit a new solution and review its execution results.")

    return {
        "user_id": user_id,
        "mastery": mastery,
        "streak_days": streak_days,
        "consistency": consistency,
        "daily_plan": daily_plan,
        "submission_count": len(submissions),
        "accepted_submission_count": accepted_count,
        "problems_solved": len(solved_problem_ids),
        "error_categories": dict(sorted(error_categories.items())),
        "activity_days": len(activity_dates),
        "has_data": bool(submissions),
    }
