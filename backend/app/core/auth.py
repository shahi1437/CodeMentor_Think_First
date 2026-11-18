from functools import lru_cache
from typing import List, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.core.config import SupabaseConfigurationError, settings
from backend.app.core.role_store import InactiveAccountError, get_user_role
from backend.app.schemas.auth import TokenPayload, UserProfile, UserRole

# Bearer token extractor
security = HTTPBearer(auto_error=False)
ASYMMETRIC_ALGORITHMS = {"ES256", "RS256"}


@lru_cache(maxsize=8)
def _jwks_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(
        f"{issuer}/.well-known/jwks.json",
        lifespan=300,
        timeout=5,
    )


def decode_jwt_token(token: str) -> TokenPayload:
    """Verify a Supabase access token and resolve its persisted application role."""
    project_url = settings.SUPABASE_URL.strip().rstrip("/")
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if not isinstance(algorithm, str) or (algorithm != "HS256" and algorithm not in ASYMMETRIC_ALGORITHMS):
            raise jwt.InvalidAlgorithmError("Unsupported signing algorithm")
        if not project_url:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase token verification requires SUPABASE_URL in backend/.env.",
            )
        issuer = f"{project_url}/auth/v1"
        if algorithm == "HS256":
            signing_key = settings.SUPABASE_JWT_SECRET
            if (
                len(signing_key.encode("utf-8")) < 32
                or signing_key.strip().lower().startswith(("replace_with", "your_"))
            ):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Legacy Supabase authentication requires a valid JWT secret.",
                )
        else:
            key_id = header.get("kid")
            if not isinstance(key_id, str) or not key_id:
                raise jwt.InvalidTokenError("Missing signing key identifier")
            public_key = _jwks_client(issuer).get_signing_key(key_id)
            if public_key.algorithm_name != algorithm:
                raise jwt.InvalidAlgorithmError("Signing key does not match algorithm")
            signing_key = public_key.key

        payload = jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            issuer=issuer,
            audience="authenticated",
            options={"require": ["sub", "exp", "iss", "aud"]},
        )
    except (jwt.PyJWKClientConnectionError, jwt.PyJWKSetError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase signing keys are temporarily unavailable.",
        ) from exc
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
    except SupabaseConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
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
    payload = await run_in_threadpool(decode_jwt_token, token)

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
