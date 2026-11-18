from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Language = Literal["python", "javascript", "cpp"]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Program = Annotated[str, Field(max_length=100_000)]
Hint = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class ProblemCaseDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: ShortText
    input_text: str = Field(default="", max_length=20_000)
    expected_output: str = Field(default="", max_length=20_000)
    is_hidden: bool = False


class ProblemDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: ShortText
    description: str = Field(default="", max_length=20_000)
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    category: ShortText = "general"
    problem_mode: Literal["normal", "debugging", "both"] = "normal"
    tags: list[ShortText] = Field(default_factory=list, max_length=20)
    supported_languages: list[Language] = Field(default_factory=lambda: ["python"], min_length=1, max_length=3)
    starter_code: dict[Language, Program] = Field(default_factory=dict)
    progressive_hints: list[Hint] = Field(default_factory=list, max_length=4)
    reference_solutions: dict[Language, Program] = Field(default_factory=dict)
    debugging_starter_code: dict[Language, Program] = Field(default_factory=dict)
    test_cases: list[ProblemCaseDraft] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_languages(self):
        enabled = set(self.supported_languages)
        if len(enabled) != len(self.supported_languages):
            raise ValueError("Choose each supported language once.")
        if any(set(programs) - enabled for programs in (
            self.starter_code, self.reference_solutions, self.debugging_starter_code,
        )):
            raise ValueError("Programs must use an enabled language.")
        return self


class ProblemDraftUpdate(ProblemDraft):
    revision: int = Field(ge=1)


class ProblemStateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    revision: int = Field(ge=1)
    state: Literal["draft", "published", "archived"]
