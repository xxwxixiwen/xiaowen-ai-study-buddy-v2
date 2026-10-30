"""Exercise the student API with temporary records and no paid model calls."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from deeptutor.api.routers.auth import require_auth
from deeptutor.api.routers.k12_learning import get_service, router
from deeptutor.services.k12_learning import LearningService


@pytest.fixture
def client(tmp_path):
    app = FastAPI()
    service = LearningService(tmp_path / 'progress.json')
    app.include_router(router, prefix='/api/k12')
    app.dependency_overrides[get_service] = lambda: service
    app.dependency_overrides[require_auth] = lambda: None
    with TestClient(app) as test_client:
        yield test_client


def test_learning_loop_records_mistake_hint_correction_and_new_question(client):
    catalog = client.get('/api/k12/catalog').json()
    assert len(catalog['questions']) == 30
    assert all('answer' not in q for q in catalog['questions'])
    assert client.post('/api/k12/lessons/complete', json={'lesson_id': 'decimal-decimal'}).status_code == 200
    wrong = client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '0.6', 'attempt_id': 'first'}).json()
    assert wrong['state']['mistakes'][0]['resolved'] is False
    assert wrong['next_question_id'] == 'T10'
    assert client.post('/api/k12/hints', json={'question_id': 'T09'}).json()['level'] == 1
    corrected = client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '0.06', 'attempt_id': 'second'}).json()
    assert corrected['attempt']['assisted'] is True
    assert corrected['state']['mistakes'][0]['resolved'] is True
    independent = client.post('/api/k12/answers', json={'question_id': 'T10', 'answer': '0.01', 'attempt_id': 'third'}).json()
    assert independent['attempt']['assisted'] is False
    state = client.get('/api/k12/state').json()
    assert state['report']['independent_correct'] == 1
    assert state['report']['independent_rate'] == 50
    assert state['completed_lessons'] == ['decimal-decimal']


def test_invalid_submission_does_not_create_records(client):
    assert client.post('/api/k12/answers', json={'question_id': 'missing', 'answer': '1', 'attempt_id': 'a'}).status_code == 400
    assert client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '  ', 'attempt_id': 'a'}).status_code == 400
    assert client.get('/api/k12/state').json()['attempts'] == []


def test_model_outage_does_not_invent_a_reply_or_mark_help_used(client, monkeypatch):
    async def unavailable(**kwargs):
        raise ConnectionError('external provider unavailable')
    monkeypatch.setattr('deeptutor.services.llm.complete', unavailable)
    response = client.post('/api/k12/coach', json={'lesson_id': 'decimal-decimal', 'question_id': 'T09', 'message': '我卡住了'})
    assert response.status_code == 503
    assert client.get('/api/k12/state').json()['hints'] == {}
    assert client.get('/api/k12/coach/history?lesson_id=decimal-decimal&question_id=T09').json()['messages'] == []


def test_linked_verification_round_trip_and_invalid_link(client):
    client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '0.6', 'attempt_id': 'w'})
    client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '0.06', 'attempt_id': 'c'})
    invalid = client.post('/api/k12/answers', json={'question_id': 'T08', 'answer': '1', 'attempt_id': 'x', 'source_question_id': 'T09'})
    assert invalid.status_code == 400
    response = client.post('/api/k12/answers', json={'question_id': 'T10', 'answer': '0.01', 'attempt_id': 'v', 'source_question_id': 'T09'})
    assert response.status_code == 200
    assert client.get('/api/k12/state').json()['report']['verified_mistakes'] == 1


@pytest.mark.parametrize(('question_id', 'requested_mode', 'message', 'expected_mode'), [
    (None, 'auto', '为什么小数点这样放？', 'explain'),
    ('T09', 'auto', '下一步怎么想？', 'hint'),
    ('T09', 'auto', '请直接示范第一步', 'demonstrate'),
    ('T09', 'explain', '换一种讲法', 'explain'),
])
def test_coach_selects_teaching_mode_in_one_bounded_call(client, monkeypatch, question_id, requested_mode, message, expected_mode):
    calls = []
    async def model(**kwargs):
        calls.append(kwargs)
        return '先看看两个因数各有几位小数。'
    monkeypatch.setattr('deeptutor.services.llm.complete', model)
    payload = {'lesson_id': 'decimal-decimal', 'message': message, 'mode': requested_mode}
    if question_id:
        payload['question_id'] = question_id
    response = client.post('/api/k12/coach', json=payload)
    assert response.status_code == 200
    assert response.json()['mode'] == expected_mode
    assert response.json()['reply'] == '先看看两个因数各有几位小数。'
    assert len(calls) == 1
    assert calls[0]['max_tokens'] <= 400
    assert calls[0]['messages'][-1]['content'] == message


def test_opening_pages_and_submitting_answers_never_calls_the_model(client, monkeypatch):
    async def forbidden(**kwargs):
        raise AssertionError('learning must work without an LLM')
    monkeypatch.setattr('deeptutor.services.llm.complete', forbidden)
    assert client.get('/api/k12/catalog').status_code == 200
    assert client.get('/api/k12/state').status_code == 200
    assert client.post('/api/k12/answers', json={'question_id': 'T09', 'answer': '0.06。', 'attempt_id': 'offline'}).json()['attempt']['correct'] is True
    assert client.post('/api/k12/hints', json={'question_id': 'T10'}).status_code == 200
