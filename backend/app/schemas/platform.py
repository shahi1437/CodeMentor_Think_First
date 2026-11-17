from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    language: Literal["python", "javascript", "cpp"] = "python"
    source_code: str = Field(..., min_length=1)
    stdin: str = ""


class ExecuteResponse(BaseModel):
    status: str
    configured: bool = False
    language: str
    stdout: str = ""
    stderr: str = ""
    compile_output: str = ""
    message: str = ""
    execution_id: Optional[str] = None


class ErrorPredictionRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = "python"
    context: str = ""


class ErrorPredictionResponse(BaseModel):
    label: str
    confidence: float
    reasons: List[str]
    message: str


class MentorRequest(BaseModel):
    question: str = Field(..., min_length=1)
    topic: str = "debugging"
    student_context: str = ""


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
