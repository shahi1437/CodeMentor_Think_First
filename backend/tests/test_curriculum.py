import httpx
import pytest

from backend.app.core import curriculum
from backend.app.core.ai_mentor import MentorConfigurationError, MentorProviderError
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_embedding_requires_configuration(monkeypatch):
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_URL', '')
    with pytest.raises(MentorConfigurationError):
        await curriculum.embed_text('A loop repeats its body.')


@pytest.mark.parametrize('values', [[], [0.0] * 1536, [1.0] * 12, [None] * 1536, [True] * 1536])
@pytest.mark.asyncio
async def test_embedding_rejects_unusable_vectors(monkeypatch, values):
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_URL', 'https://embeddings.example.test')
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_API_KEY', 'test-key')
    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'data': [{'embedding': values}]}))
    monkeypatch.setattr(curriculum.httpx, 'AsyncClient', lambda **kwargs: real_client(transport=transport, **kwargs))
    with pytest.raises(MentorProviderError):
        await curriculum.embed_text('A loop repeats its body.')


@pytest.mark.asyncio
async def test_embedding_returns_provider_vector(monkeypatch):
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_URL', 'https://embeddings.example.test')
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_API_KEY', 'test-key')
    values = [0.5] * 1536
    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'data': [{'embedding': values}]}))
    monkeypatch.setattr(curriculum.httpx, 'AsyncClient', lambda **kwargs: real_client(transport=transport, **kwargs))
    assert await curriculum.embed_text('A loop repeats its body.') == values
