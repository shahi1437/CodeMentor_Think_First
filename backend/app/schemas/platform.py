from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExecuteRequest(BaseModel):
    language: Literal["python", "javascript", "cpp"] = "python"
    source_code: str = Field(..., min_length=1, max_length=100_000)
    stdin: str = Field(default="", max_length=20_000)


class ExecuteResponse(BaseModel):
    status: str
    configured: bool = False
    language: str
    stdout: str = ""
    stderr: str = ""
    compile_output: str = ""
    message: str = ""
    execution_id: Optional[str] = None
    execution_time_ms: Optional[int] = None
    memory_kb: Optional[int] = None


class TestCaseInput(BaseModel):
    input: str = ""
    expected_output: str = ""
    is_hidden: bool = False


class SubmissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problem_id: str = Field(..., min_length=1)
    language: Literal["python", "javascript", "cpp"] = "python"
    source_code: str = Field(..., min_length=1, max_length=100_000)
    stdin: str = Field(default="", max_length=20_000)
    mode: Literal["run", "submit"] = "submit"


class SubmissionResponse(BaseModel):
    submission_id: Optional[str] = None
    verdict: str
    passed_test_count: int = 0
    total_test_count: int = 0
    score: float = 0.0
    message: str
    status: str
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: Optional[int] = None
    memory_kb: Optional[int] = None


class ErrorPredictionRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = "python"
    context: str = ""


class ErrorPredictionResponse(BaseModel):
    label: str
    confidence: float
    reasons: List[str]
    message: str


class MentorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class MentorRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    topic: str = Field(default="debugging", max_length=100)
    student_context: str = Field(default="", max_length=3000)
    mode: Literal["socratic", "conceptual"] = "socratic"
    history: List[MentorMessage] = Field(default_factory=list, max_length=12)


class MentorResponse(BaseModel):
    answer: str
    source: str
    safe_mode: bool


class LearningDNAResponse(BaseModel):
    user_id: str
    mastery: Dict[str, float]
    streak_days: int
    consistency: float
    daily_plan: List[str]
    submission_count: int
    accepted_submission_count: int
    problems_solved: int
    error_categories: Dict[str, int]
    activity_days: int
    has_data: bool


class DailyPlanTaskUpdate(BaseModel):
    completed: bool
