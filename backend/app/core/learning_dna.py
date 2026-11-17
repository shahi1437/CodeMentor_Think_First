from __future__ import annotations

from typing import Any, Dict, List


def summarize_learning_dna(user_id: str, metrics: Dict[str, Any] | None = None) -> Dict[str, Any]:
    metrics = metrics or {}
    problems_solved = int(metrics.get("problems_solved", 8))
    bugs_fixed = int(metrics.get("bugs_fixed", 6))
    streak_days = int(metrics.get("streak_days", 14))
    consistency = float(metrics.get("consistency", 0.76))

    mastery = {
        "python": round(min(99.0, 48.0 + problems_solved * 2.5), 1),
        "javascript": round(min(96.0, 42.0 + bugs_fixed), 1),
        "cpp": round(min(94.0, 40.0 + (problems_solved * 1.6)), 1),
        "debugging": round(min(98.0, 50.0 + bugs_fixed * 2.2), 1),
    }

    daily_plan: List[str] = [
        "Review the last three failed debugging attempts and compare expected vs actual output.",
        "Solve one timed array or string problem to strengthen pattern recognition.",
        "Complete one focused challenge in the student's weakest language skill area.",
    ]

    return {
        "user_id": user_id,
        "mastery": mastery,
        "streak_days": streak_days,
        "consistency": round(consistency, 2),
        "daily_plan": daily_plan,
    }
