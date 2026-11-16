from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    preferred_language: str = "python"
    is_active: bool = True

    model_config = {"from_attributes": True}


class TokenPayload(BaseModel):
    sub: str  # User UUID
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    app_metadata: Optional[dict] = Field(default_factory=dict)
    user_metadata: Optional[dict] = Field(default_factory=dict)
    exp: Optional[int] = None


class RoleUpdateRequest(BaseModel):
    user_id: str
    target_role: UserRole


class RoleUpdateResponse(BaseModel):
    success: bool
    user_id: str
    new_role: UserRole
    message: str
