from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from backend.app.core.auth import require_admin
from backend.app.core.database import get_database_service
from backend.app.core.grading import grade_cases
from backend.app.core.judge0 import execute_code
from backend.app.schemas.auth import UserProfile
from backend.app.schemas.platform import TestCaseInput
from backend.app.schemas.problem_admin import ProblemDraft, ProblemDraftUpdate, ProblemStateUpdate

router = APIRouter(prefix="/admin/problems", tags=["Problem authoring"], dependencies=[Depends(require_admin)])


def database_call(action, *args):
    try:
        return action(*args)
    except (APIError, RuntimeError) as exc:
        raise HTTPException(503, "The problem store is temporarily unavailable.") from exc


@router.get("")
def list_problems():
    return database_call(get_database_service().list_problems, 100, True)


@router.get("/{problem_id}")
def read_problem(problem_id: UUID):
    record = database_call(get_database_service().get_admin_problem, str(problem_id))
    if not record:
        raise HTTPException(404, "Problem not found.")
    return record


@router.post("", status_code=201)
def create_problem(payload: ProblemDraft, admin: UserProfile = Depends(require_admin)):
    database = get_database_service()
    problem_id = database_call(database.save_problem_draft, None, None, admin.id, payload.model_dump())
    if not problem_id:
        raise HTTPException(503, "The draft could not be saved.")
    return read_problem(problem_id)


@router.put("/{problem_id}")
def edit_problem(problem_id: UUID, payload: ProblemDraftUpdate, admin: UserProfile = Depends(require_admin)):
    database = get_database_service()
    saved = database_call(
        database.save_problem_draft, str(problem_id), payload.revision, admin.id,
        payload.model_dump(exclude={"revision"}),
    )
    if not saved:
        raise HTTPException(409, "Reload the latest draft. Unpublish a published problem before editing.")
    return read_problem(problem_id)


async def verify_problem(draft: ProblemDraft) -> None:
    if not any(case.is_hidden for case in draft.test_cases) or not any(not case.is_hidden for case in draft.test_cases):
        raise HTTPException(422, "Add at least one public sample and one hidden grading case.")
    cases = [TestCaseInput(input=case.input_text, expected_output=case.expected_output, is_hidden=case.is_hidden)
             for case in draft.test_cases]
    for language in draft.supported_languages:
        reference = draft.reference_solutions.get(language, "")
        if not reference.strip():
            raise HTTPException(422, f"Add a reference solution for {language}.")
        result = await grade_cases(execute_code, language, reference, cases)
        if result.verdict in {"configuration_error", "error"}:
            raise HTTPException(503, "Judge0 is unavailable. Try verification again later.")
        if result.verdict != "accepted":
            raise HTTPException(422, f"The {language} reference solution must pass every case.")
        if draft.problem_mode in {"debugging", "both"}:
            buggy = draft.debugging_starter_code.get(language, "")
            if not buggy.strip():
                raise HTTPException(422, f"Add a debugging variant for {language}.")
            result = await grade_cases(execute_code, language, buggy, cases)
            if result.verdict in {"configuration_error", "error"}:
                raise HTTPException(503, "Judge0 is unavailable. Try verification again later.")
            if result.verdict in {"accepted", "validation_error"}:
                raise HTTPException(422, f"The {language} debugging variant must fail a case in Judge0.")


@router.post("/{problem_id}/state")
async def change_state(problem_id: UUID, payload: ProblemStateUpdate):
    record = read_problem(problem_id)
    if record["revision"] != payload.revision or record["archived_at"]:
        raise HTTPException(409, "Reload the latest problem before changing its state.")
    if payload.state == "published":
        if record["is_published"]:
            raise HTTPException(409, "Unpublish this problem before verifying another revision.")
        draft = ProblemDraft.model_validate({key: record[key] for key in ProblemDraft.model_fields if record.get(key) is not None})
        await verify_problem(draft)
    database = get_database_service()
    if not database_call(database.change_problem_state, str(problem_id), payload.revision, payload.state):
        raise HTTPException(409, "This problem changed during verification. Reload and try again.")
    return read_problem(problem_id)
