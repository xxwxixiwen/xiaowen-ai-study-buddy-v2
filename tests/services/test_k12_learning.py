from pathlib import Path

import pytest

from deeptutor.services.k12_learning import LearningService


@pytest.fixture
def service(tmp_path):
    return LearningService(tmp_path / 'learning.json')


@pytest.mark.parametrize('answer', ['1', '1.0', '１．００', ' 1.00 '])
def test_equivalent_numeric_answers_are_correct(service, answer):
    assert service.submit('T08', answer, 'attempt-1')['attempt']['correct'] is True


@pytest.mark.parametrize('answer', ['', 'NaN', 'Infinity', '1+0', '0.999999'])
def test_invalid_or_unequal_answers_cannot_pass(service, answer):
    if not answer:
        with pytest.raises(ValueError):
            service.submit('T08', answer, 'attempt-1')
    else:
        assert service.submit('T08', answer, 'attempt-1')['attempt']['correct'] is False


def test_retry_is_idempotent_and_wrong_answer_is_saved(service):
    service.submit('T09', '0.6', 'same-id')
    service.submit('T09', '0.6', 'same-id')
    state = LearningService(service.path).state()
    assert len(state['attempts']) == 1
    assert state['attempts'][0]['answer'] == '0.6'
    assert state['report']['independent_correct'] == 0


def test_hint_and_correction_do_not_count_as_independent_mastery(service):
    service.hint('T09')
    result = service.submit('T09', '0.06', 'a1')
    assert result['attempt']['assisted'] is True
    assert result['state']['report']['independent_correct'] == 0
    assert result['state']['report']['correct'] == 1


def test_wrong_then_correct_is_a_correction_even_without_hint(service):
    service.submit('T09', '0.6', 'a1')
    result = service.submit('T09', '0.06', 'a2')
    assert result['attempt']['assisted'] is True
    assert result['state']['mistakes'][0]['resolved'] is True


def test_new_same_topic_question_is_recommended_after_mistake(service):
    result = service.submit('T09', '0.6', 'a1')
    next_id = result['next_question_id']
    assert next_id != 'T09'
    assert service.question(next_id)['topic'] == service.question('T09')['topic']


def test_catalog_never_exposes_answers(service):
    questions = service.catalog()['questions']
    assert len(questions) == 30
    assert all('answer' not in q and 'explanation' not in q for q in questions)


def test_accounts_use_separate_files(tmp_path):
    alice = LearningService(tmp_path / 'alice.json')
    bob = LearningService(tmp_path / 'bob.json')
    alice.submit('T09', '0.6', 'a1')
    assert bob.state()['attempts'] == []


def test_lesson_completion_is_validated_and_persisted(service):
    service.complete_lesson('decimal-int')
    service.complete_lesson('decimal-int')
    assert LearningService(service.path).state()['completed_lessons'] == ['decimal-int']
    with pytest.raises(ValueError):
        service.complete_lesson('../../unknown')


def test_coach_context_uses_server_judgment_and_matching_lesson(service):
    service.submit('T09', '0.6', 'a1')
    context = service.coach_context('decimal-decimal', 'T09')
    assert '0.6' in context
    assert '不正确' in context
    assert '位数不够' in context
    with pytest.raises(ValueError):
        service.coach_context('addition', 'T09')


def test_coach_history_survives_reload_and_does_not_mix_contexts(service):
    service.save_exchange('lesson:decimal-decimal', '为什么', '一起看看方格')
    restored = LearningService(service.path)
    assert restored.history('lesson:decimal-decimal')[-1]['content'] == '一起看看方格'
    assert restored.history('question:T09') == []


def test_multiturn_coach_keeps_teaching_rules_and_latest_question(service):
    from deeptutor.services.k12_learning import build_coach_messages
    messages = build_coach_messages('教学规则', [{'role': 'user', 'content': '第一问'}, {'role': 'assistant', 'content': '第一次回答'}], '第二问')
    assert messages[0] == {'role': 'system', 'content': '教学规则'}
    assert messages[-1] == {'role': 'user', 'content': '第二问'}
    assert messages[1]['content'] == '第一问'


@pytest.mark.parametrize(('qid', 'answer'), [('T26', '0.96元'), ('T25', '15.6千米'), ('T08', '1元')])
def test_wrong_dimension_is_not_credited(service, qid, answer):
    assert service.submit(qid, answer, 'units')['attempt']['correct'] is False


@pytest.mark.parametrize('answer', ['0.96', '0.96平方米'])
def test_area_accepts_correct_unit_or_number_only(service, answer):
    assert service.submit('T26', answer, 'area')['attempt']['correct'] is True


def test_judgment_can_be_submitted_with_a_separate_explanation(service):
    result = service.submit('T30', '不合理，因为积约等于6', 'explanation')
    assert result['attempt']['correct'] is True


@pytest.mark.parametrize(('qid', 'answer'), [
    ('T09', '0.06。'), ('T09', '0.2×0.3=0.06'),
    ('T21', '错，因为0.9小于1'), ('T26', '0.96m²'),
    ('T26', '0.96㎡'), ('T27', '0.3公里'),
])
def test_natural_answer_formats_are_accepted(service, qid, answer):
    assert service.submit(qid, answer, 'natural')['attempt']['correct'] is True


@pytest.mark.parametrize('answer', ['9×9=0.06', '随便写=0.06', '0.06美元', '0.06或0.6'])
def test_tolerant_judging_does_not_accept_false_equations_or_ambiguous_answers(service, answer):
    assert service.submit('T09', answer, 'invalid')['attempt']['correct'] is False


def test_judgment_credit_explicitly_does_not_verify_the_reason(service):
    attempt = service.submit('T30', '不合理，因为52.2太小了', 'reason')['attempt']
    assert attempt['correct'] is True
    assert attempt['checked_scope'] == 'judgment_only'


def corrected_source(service):
    service.submit('T09', '0.6', 'wrong')
    return service.submit('T09', '0.06', 'correction')


def test_correction_creates_a_persistent_same_topic_verification(service):
    correction = corrected_source(service)
    assert correction['next_question_kind'] == 'verification'
    assert correction['next_review_source_id'] == 'T09'
    assert correction['next_question_id'] == 'T10'
    mistake = LearningService(service.path).state()['mistakes'][0]
    assert mistake['review_status'] == 'pending'
    assert mistake['review_question_id'] == 'T10'


def test_independent_transfer_success_updates_the_source_mistake_and_report(service):
    corrected_source(service)
    result = service.submit('T10', '0.01', 'transfer', source_question_id='T09')
    assert result['attempt']['source_question_id'] == 'T09'
    restored = LearningService(service.path).state()
    assert restored['mistakes'][0]['review_status'] == 'verified'
    assert restored['report']['verified_mistakes'] == 1
    assert restored['report']['pending_verifications'] == 0
    assert restored['report']['independent_rate'] == 50
    assert len(service.submit('T10', '0.01', 'transfer', source_question_id='T09')['state']['attempts']) == 3


def test_assisted_transfer_does_not_pass_verification_and_offers_an_unused_question(service):
    corrected_source(service)
    service.hint('T10')
    result = service.submit('T10', '0.01', 'helped', source_question_id='T09')
    mistake = result['state']['mistakes'][0]
    assert mistake['review_status'] == 'needs_practice'
    assert mistake['review_question_id'] == 'T19'
    assert result['state']['report']['verified_mistakes'] == 0
    passed = service.submit('T19', '0.018', 'fresh', source_question_id='T09')
    assert passed['state']['report']['verified_mistakes'] == 1


def test_wrong_then_correct_transfer_requires_a_different_fresh_question(service):
    corrected_source(service)
    wrong = service.submit('T10', '0.1', 'transfer-wrong', source_question_id='T09')
    assert wrong['state']['mistakes'][0]['review_status'] == 'needs_practice'
    corrected = service.submit('T10', '0.01', 'transfer-correct', source_question_id='T09')
    assert corrected['state']['mistakes'][0]['review_status'] != 'verified'
    assert corrected['next_question_id'] == 'T19'
    assert corrected['next_review_source_id'] == 'T09'


def test_normal_practice_does_not_silently_count_as_a_linked_verification(service):
    corrected_source(service)
    result = service.submit('T10', '0.01', 'normal')
    assert result['state']['report']['verified_mistakes'] == 0
    assert result['state']['mistakes'][0]['review_question_id'] == 'T19'


@pytest.mark.parametrize(('qid', 'source'), [('T10', 'T01'), ('T08', 'T09'), ('T09', 'T09')])
def test_unrelated_or_uncorrected_verification_is_rejected_without_writing(service, qid, source):
    corrected_source(service)
    before = service.path.read_text()
    with pytest.raises(ValueError):
        service.submit(qid, '1', 'bad-link', source_question_id=source)
    assert service.path.read_text() == before


def test_repeated_wrong_source_reopens_a_previously_verified_mistake(service):
    corrected_source(service)
    service.submit('T10', '0.01', 'transfer', source_question_id='T09')
    state = service.submit('T09', '0.6', 'again')['state']
    assert state['mistakes'][0]['review_status'] == 'not_started'
    assert state['report']['verified_mistakes'] == 0


def test_exhausted_bank_never_calls_an_old_question_new(service):
    from deeptutor.services.k12_learning import QUESTIONS
    for q in QUESTIONS:
        result = service.submit(q['id'], q['answer'], q['id'])
    assert result['next_question_kind'] == 'review'


def test_no_unseen_same_topic_question_does_not_fake_a_verification(service):
    service.submit('T10', '0.01', 'seen1')
    service.submit('T19', '0.018', 'seen2')
    result = corrected_source(service)
    mistake = result['state']['mistakes'][0]
    assert mistake['review_status'] == 'unavailable'
    assert mistake['review_question_id'] is None
    assert result['next_question_kind'] != 'verification'


def test_old_records_load_without_losing_progress_or_inventing_transfer_success(service):
    import json
    corrected_source(service)
    data = json.loads(service.path.read_text())
    data.pop('reviews', None)
    service.path.write_text(json.dumps(data))
    restored = LearningService(service.path).state()
    assert len(restored['attempts']) == 2
    assert restored['mistakes'][0]['review_status'] == 'pending'
    assert restored['report']['verified_mistakes'] == 0


def test_coach_context_distinguishes_a_correct_judgment_from_an_unchecked_reason(service):
    service.submit('T30', '不合理，因为52.2太小了', 'bad-reason')
    context = service.coach_context('decimal-check', 'T30')
    assert '理由尚未核验' in context
