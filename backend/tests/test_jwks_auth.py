import io
import json
import time
from urllib.error import URLError

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi import HTTPException

from backend.app.core.auth import _jwks_client, decode_jwt_token
from backend.app.core.config import settings
from backend.app.schemas.auth import UserRole


@pytest.fixture(params=["ES256", "RS256"])
def asymmetric_session(request, monkeypatch, isolate_auth_configuration):
    issuer = "https://jwt-test.supabase.co/auth/v1"
    algorithm = request.param
    if algorithm == "ES256":
        key = ec.generate_private_key(ec.SECP256R1())
        jwk = jwt.algorithms.ECAlgorithm.to_jwk(key.public_key(), as_dict=True)
    else:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        jwk = jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key(), as_dict=True)
    kid = "test-signing-key"
    jwk.update(kid=kid, alg=algorithm, use="sig")
    calls = []

    def read_public_keys(self, request, *args, **kwargs):
        calls.append(request.full_url)
        return io.BytesIO(json.dumps({"keys": [jwk]}).encode())

    monkeypatch.setattr(settings, "SUPABASE_URL", issuer.removesuffix("/auth/v1"))
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    monkeypatch.setattr(jwt.jwks_client.urllib.request.OpenerDirector, "open", read_public_keys)
    isolate_auth_configuration.set_user_role("es-student", UserRole.STUDENT)
    _jwks_client.cache_clear()

    def make_token(signing_key=key, **claims):
        payload = {
            "sub": "es-student",
            "email": "student@example.com",
            "iss": issuer,
            "aud": "authenticated",
            "exp": int(time.time()) + 300,
            "user_metadata": {"role": "admin"},
        }
        payload.update(claims)
        return jwt.encode(payload, signing_key, algorithm=algorithm, headers={"kid": kid})

    yield issuer, calls, make_token
    _jwks_client.cache_clear()


def test_asymmetric_token_uses_cached_project_jwks_and_persisted_role(asymmetric_session):
    issuer, calls, make_token = asymmetric_session
    assert decode_jwt_token(make_token()).role == UserRole.STUDENT
    assert decode_jwt_token(make_token()).sub == "es-student"
    assert calls == [f"{issuer}/.well-known/jwks.json"]


@pytest.mark.parametrize("claims", [
    {"iss": "https://another.supabase.co/auth/v1"},
    {"aud": "anon"},
    {"aud": None},
    {"exp": 1},
])
def test_asymmetric_token_rejects_invalid_claims(asymmetric_session, claims):
    _, _, make_token = asymmetric_session
    with pytest.raises(HTTPException) as exc:
        decode_jwt_token(make_token(**claims))
    assert exc.value.status_code == 401


def test_asymmetric_token_rejects_a_different_signature(asymmetric_session):
    _, _, make_token = asymmetric_session
    algorithm = jwt.get_unverified_header(make_token())["alg"]
    other_key = (
        ec.generate_private_key(ec.SECP256R1()) if algorithm == "ES256"
        else rsa.generate_private_key(public_exponent=65537, key_size=2048)
    )
    with pytest.raises(HTTPException) as exc:
        decode_jwt_token(make_token(signing_key=other_key))
    assert exc.value.status_code == 401


def test_unavailable_jwks_returns_service_unavailable(asymmetric_session, monkeypatch):
    _, _, make_token = asymmetric_session

    def unavailable(*args, **kwargs):
        raise URLError("Test connection failure")

    monkeypatch.setattr(jwt.jwks_client.urllib.request.OpenerDirector, "open", unavailable)
    with pytest.raises(HTTPException) as exc:
        decode_jwt_token(make_token())
    assert exc.value.status_code == 503
