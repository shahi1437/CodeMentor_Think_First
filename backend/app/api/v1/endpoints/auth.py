from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.auth import (
    get_current_user,
    require_admin,
    require_student,
    require_teacher,
)
from backend.app.core.role_store import set_user_role
from backend.app.schemas.auth import (
    RoleUpdateRequest,
    RoleUpdateResponse,
    UserProfile,
    UserRole,
)

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.get("/me", response_model=UserProfile)
async def read_current_user(current_user: UserProfile = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile and verified role.
    """
    return current_user


@router.get("/student-resource")
async def get_student_resource(current_user: UserProfile = Depends(require_student)):
    """
    Protected endpoint accessible by Students, Teachers, and Admins.
    """
    return {
        "status": "success",
        "message": f"Welcome to Student Workspace, {current_user.full_name or current_user.email}!",
        "role": current_user.role,
        "features": ["Problem Hub", "Normal Coding Workspace", "Debugging Lab", "Learning DNA"],
    }


@router.get("/teacher-resource")
async def get_teacher_resource(current_user: UserProfile = Depends(require_teacher)):
    """
    Protected endpoint accessible only by Teachers and Admins.
    Students attempting to access will receive HTTP 403 Forbidden.
    """
    return {
        "status": "success",
        "message": f"Welcome to Instructor Portal, {current_user.full_name or current_user.email}!",
        "role": current_user.role,
        "features": ["Live Struggle Radar", "Class Error Heatmaps", "Direct Socratic Interventions"],
    }


@router.get("/admin-resource")
async def get_admin_resource(current_user: UserProfile = Depends(require_admin)):
    """
    Protected endpoint strictly accessible only by Admins.
    Students and Teachers will receive HTTP 403 Forbidden.
    """
    return {
        "status": "success",
        "message": "Welcome to Administrator Telemetry Console.",
        "role": current_user.role,
        "features": ["Sandbox Cluster Management", "User Role Promotions", "Audit Logs"],
    }


@router.post("/admin/assign-role", response_model=RoleUpdateResponse)
async def assign_user_role(
    payload: RoleUpdateRequest,
    current_admin: UserProfile = Depends(require_admin),
):
    """
    Admin-only endpoint to promote or adjust a user's role.
    Crucial Security Rule: Regular users and teachers CANNOT call this endpoint.
    Admin roles can never be self-assigned in the client signup.
    """
    if current_admin.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: administrative privileges are required to change user roles.",
        )

    # Prevent admin from accidentally demoting themselves if modifying own id.
    if payload.user_id == current_admin.id and payload.target_role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety guardrail: Admins cannot demote their own account from the API.",
        )

    updated_role = set_user_role(payload.user_id, payload.target_role)

    return RoleUpdateResponse(
        success=True,
        user_id=payload.user_id,
        new_role=updated_role,
        message=f"Role for user {payload.user_id} successfully updated to '{updated_role.value}'.",
    )
