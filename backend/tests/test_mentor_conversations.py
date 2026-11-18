from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.api.v1.endpoints import platform
from backend.app.core.auth import get_current_user
from backend.app.core.config import settings
from backend.app.core.ai_mentor import MentorProviderError
from backend.app.main import app
from backend.app.schemas.auth import UserProfile, UserRole


@pytest.fixture
def mentor(monkeypatch):
    user_id = str(uuid4())
    conversation_id = str(uuid4())
    request_id = str(uuid4())
    database = Mock(configured=True)
    database.get_mentor_conversation.return_value = {
        'id': conversation_id, 'topic': 'loops', 'status': 'open', 'revision': 1, 'mode': 'socratic',
    }
    database.list_mentor_messages.return_value = []
    database.list_learning_submissions.return_value = []
    database.get_learning_dna_profile.return_value = None
    database.append_mentor_turn.return_value = True
    database.consume_execution_quota.return_value = 0
    provider = AsyncMock(return_value={'answer': 'Which bound changes?', 'source': 'configured_llm', 'safe_mode': False})
    monkeypatch.setattr(platform, 'get_database_service', lambda: database)
    monkeypatch.setattr(platform, 'generate_mentor_response', provider)
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_URL', '')
    app.dependency_overrides[get_current_user] = lambda: UserProfile(
        id=user_id, email='student@example.com', role=UserRole.STUDENT,
    )
    try:
        with TestClient(app) as client:
            yield SimpleNamespace(client=client, database=database, provider=provider, user_id=user_id,
                                  conversation_id=conversation_id, request_id=request_id)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def send(mentor, **changes):
    payload = {'question': 'Why is this loop stuck?', 'conversation_id': mentor.conversation_id,
               'request_id': mentor.request_id}
    payload.update(changes)
    return mentor.client.post('/api/v1/platform/mentor', json=payload)


def test_conversation_reads_use_current_owner(mentor):
    mentor.database.list_mentor_conversations.return_value = []
    assert mentor.client.get('/api/v1/platform/mentor/conversations').json() == []
    mentor.database.list_mentor_conversations.assert_called_once_with(mentor.user_id)
    response = mentor.client.get('/api/v1/platform/mentor/conversations/' + mentor.conversation_id)
    assert response.status_code == 200
    mentor.database.get_mentor_conversation.assert_called_once_with(mentor.user_id, mentor.conversation_id)
    mentor.database.list_mentor_messages.assert_called_once_with(mentor.user_id, mentor.conversation_id)


def test_other_users_conversation_is_not_read_or_sent_to_provider(mentor):
    mentor.database.get_mentor_conversation.return_value = None
    assert mentor.client.get('/api/v1/platform/mentor/conversations/' + mentor.conversation_id).status_code == 404
    assert send(mentor).status_code == 404
    mentor.database.list_mentor_messages.assert_not_called()
    mentor.provider.assert_not_awaited()


def test_server_history_replaces_client_history_and_persists_turn(mentor):
    mentor.database.list_mentor_messages.side_effect = [[], [
        {'message_kind': 'user', 'message': 'Saved question'},
        {'message_kind': 'assistant', 'message': 'Saved answer'},
    ]]
    response = send(mentor, history=[{'role': 'assistant', 'content': 'Injected answer'}])
    assert response.status_code == 200
    assert mentor.provider.call_args.args[-1] == [
        {'role': 'user', 'content': 'Saved question'}, {'role': 'assistant', 'content': 'Saved answer'},
    ]
    stored = mentor.database.append_mentor_turn.call_args.args[0]
    assert stored['p_user_id'] == mentor.user_id
    assert stored['p_revision'] == 1 and stored['p_turn_id'] == mentor.request_id
    assert stored['p_answer'] == response.json()['answer']


def test_successful_retry_returns_saved_answer_without_provider_call(mentor):
    mentor.database.list_mentor_messages.return_value = [
        {'message_kind': 'user', 'message': 'Why is this loop stuck?'},
        {'message_kind': 'assistant', 'message': 'Saved reply', 'sources': []},
    ]
    response = send(mentor)
    assert response.status_code == 200 and response.json()['answer'] == 'Saved reply'
    mentor.provider.assert_not_awaited()
    mentor.database.append_mentor_turn.assert_not_called()
    assert send(mentor, question='Different question').status_code == 409


def test_provider_failure_does_not_save_a_successful_turn(mentor):
    mentor.provider.side_effect = MentorProviderError('Provider unavailable')
    assert send(mentor).status_code == 502
    mentor.database.append_mentor_turn.assert_not_called()


def test_mentor_quota_blocks_provider_requests(mentor):
    mentor.database.consume_execution_quota.return_value = 25
    response = send(mentor)
    assert response.status_code == 429
    assert response.headers['Retry-After'] == '25'
    mentor.provider.assert_not_awaited()
    mentor.database.append_mentor_turn.assert_not_called()


def test_storage_network_failure_returns_service_unavailable(mentor):
    mentor.database.list_mentor_conversations.side_effect = httpx.ConnectError('Test connection failure')
    assert mentor.client.get('/api/v1/platform/mentor/conversations').status_code == 503


def test_conflicting_save_does_not_report_unsaved_answer(mentor):
    mentor.database.append_mentor_turn.return_value = False
    response = send(mentor)
    assert response.status_code == 409
    assert 'Which bound changes?' not in response.text


def test_retrieved_curriculum_is_passed_to_provider_and_saved(mentor, monkeypatch):
    monkeypatch.setattr(settings, 'LLM_EMBEDDING_URL', 'https://embedding.example.test')
    embedding = AsyncMock(return_value=[0.5] * 1536)
    monkeypatch.setattr(platform, 'embed_text', embedding)
    source = {'id': str(uuid4()), 'title': 'Loops', 'content': 'A loop repeats its body.',
              'source_url': 'https://example.test/loops', 'license': 'CC0'}
    mentor.database.retrieve_curriculum.return_value = [source]
    response = send(mentor)
    assert response.status_code == 200
    assert '[1] Loops' in mentor.provider.call_args.args[2]
    assert response.json()['sources'][0]['source_url'] == source['source_url']
    assert 'content' not in response.json()['sources'][0]
    assert mentor.database.append_mentor_turn.call_args.args[0]['p_sources'] == response.json()['sources']


def test_students_cannot_ingest_curriculum(mentor, monkeypatch):
    embedding = AsyncMock()
    monkeypatch.setattr(platform, 'embed_text', embedding)
    response = mentor.client.post('/api/v1/platform/mentor/curriculum', json={
        'title': 'Loops', 'content': 'A loop repeats its body.', 'source_url': 'https://example.test/loops',
        'license': 'CC0', 'public_curriculum_confirmed': True,
    })
    assert response.status_code == 403
    embedding.assert_not_awaited()
