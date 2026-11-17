from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.core.config import settings
from backend.app.core.role_store import InactiveAccountError, get_user_role
from backend.app.schemas.auth import TokenPayload, UserProfile, UserRole

# Bearer token extractor
security = HTTPBearer(auto_error=False)


def decode_jwt_token(token: str) -> TokenPayload:
    """
    Decodes and verifies a Supabase JWT token.
    Supabase signs tokens with HS256 using the project's JWT Secret.
    """
    jwt_secret = settings.SUPABASE_JWT_SECRET
    if (
        not jwt_secret
        or len(jwt_secret.encode("utf-8")) < 32
        or jwt_secret.strip().lower().startswith(("replace_with", "your_"))
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured with a valid Supabase JWT secret.",
        )

    try:
        # Decode using the project's JWT secret
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase aud is typically 'authenticated'
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    # Extract user ID and role
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: subject (sub) claim missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        stored_role = get_user_role(sub)
    except InactiveAccountError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The account role could not be verified against Supabase.",
        ) from exc
    if stored_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The account has no persisted profile role.",
        )

    user_meta = payload.get("user_metadata")
    if not isinstance(user_meta, dict):
        user_meta = {}
    app_meta = payload.get("app_metadata")
    if not isinstance(app_meta, dict):
        app_meta = {}

    return TokenPayload(
        sub=sub,
        email=payload.get("email") or user_meta.get("email"),
        role=stored_role,
        app_metadata=app_meta,
        user_metadata=user_meta,
        exp=payload.get("exp"),
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserProfile:
    """
    FastAPI dependency to extract and authenticate the current user.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token in the Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_jwt_token(token)

    # Return validated profile
    return UserProfile(
        id=payload.sub,
        email=payload.email or f"{payload.sub[:8]}@codementor.ai",
        full_name=payload.user_metadata.get("full_name") or "CodeMentor User",
        role=payload.role or UserRole.STUDENT,
        preferred_language=payload.user_metadata.get("preferred_language", "python"),
        is_active=True,
    )


def require_role(allowed_roles: List[UserRole]):
    """
    FastAPI dependency factory enforcing Role-Based Access Control (RBAC).
    Admins are always authorized if allowed_roles contains either admin or teacher or student.
    """
    async def role_checker(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
        # Check if user's role is allowed
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied: This action requires one of the following roles: "
                    f"{[r.value for r in allowed_roles]}. Your current role is '{current_user.role.value}'."
                ),
            )
        return current_user

    return role_checker


# Convenient pre-configured role dependencies
require_student = require_role([UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN])
require_teacher = require_role([UserRole.TEACHER, UserRole.ADMIN])
require_admin = require_role([UserRole.ADMIN])
