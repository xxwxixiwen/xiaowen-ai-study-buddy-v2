"""Small, durable learning loop. Judging and progress never depend on an LLM."""
from __future__ import annotations

import json
import re
import threading
import unicodedata
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from deeptutor.services.file_io import atomic_write_json

_LOCK = threading.RLock()
QUESTIONS = json.loads(Path(__file__).with_name('k12_catalog.json').read_text(encoding='utf-8'))
LESSONS = [
    {'id': 'decimal-int', 'title': '小数乘整数', 'subtitle': '把熟悉的整数乘法，变成新本领', 'minutes': 8, 'grade': '五年级上册', 'kind': 'interactive', 'sections': [
        {'title': '从买文具开始', 'text': '一支铅笔 2.3 元，买 3 支。可以把 2.3 元看成 23 角，23 × 3 = 69 角，也就是 6.9 元。小数乘法和整数乘法之间，藏着单位的转换。'},
        {'title': '先算整数，再还原大小', 'text': '计算 2.3 × 3：先算 23 × 3 = 69。把 2.3 扩大到原来的 10 倍后，积也扩大到原来的 10 倍，因此需要把 69 缩小到原来的十分之一，得到 6.9。'},
        {'title': '用估算检查', 'text': '2.3 × 3 大约等于 2 × 3，也就是 6。结果 6.9 很合理；如果得到 69，就需要检查小数点的位置。'}]},
    {'id': 'decimal-decimal', 'title': '小数乘小数', 'subtitle': '用一张方格纸，看懂小数点的位置', 'minutes': 10, 'grade': '五年级上册', 'kind': 'interactive', 'sections': [
        {'title': '在方格里发现 0.06', 'text': '把一个正方形平均分成 100 个小方格。取宽的 0.2 和高的 0.3，重叠部分占 6 个小方格，也就是整个正方形的 0.06。因此 0.2 × 0.3 = 0.06。'},
        {'title': '小数点为什么这样放', 'text': '计算 0.2 × 0.3，先算 2 × 3 = 6。两个因数各扩大到原来的 10 倍，积就扩大到原来的 100 倍，所以要把 6 除以 100，得到 0.06。'},
        {'title': '位数不够，先补零', 'text': '先按整数乘法算，再数两个因数一共有几位小数，从积的右边起数出相应位数并点小数点。位数不足时在前面补零。例如 0.06 × 0.3：6 × 3 = 18，要有三位小数，得到 0.018。先定位小数点，再去掉小数末尾的零。'}]},
    {'id': 'decimal-check', 'title': '估算与生活应用', 'subtitle': '算完以后，多问一句：合理吗？', 'minutes': 8, 'grade': '五年级上册', 'kind': 'interactive', 'sections': [
        {'title': '积一定会变大吗', 'text': '对于正数，一个数乘大于 1 的数，积变大；乘大于 0 且小于 1 的数，积变小；乘 1，大小不变。因此 3.2 × 0.9 比 3.2 小。'},
        {'title': '用估算发现错误', 'text': '1.8 × 2.9 接近 2 × 3，积大约是 6。如果算成 52.2，就应重新检查计算过程和小数点。估算能帮助检查，不能代替精确计算。'},
        {'title': '回到生活里', 'text': '苹果每千克 6.5 元，买 2.4 千克，需要用单价乘数量。先明确要求的量，再列出 6.5 × 2.4，最后带上单位元。'}]},
    {'id': 'addition', 'title': '加法竖式（不进位）', 'subtitle': '从个位开始，学会对齐数位', 'minutes': None, 'grade': '基础运算', 'kind': 'video', 'sections': [
        {'title': '数位对齐', 'text': '列加法竖式时，个位对齐个位，十位对齐十位，从个位加起。'},
        {'title': '同一数位相加', 'text': '计算 23 + 14：个位 3 + 4 = 7，十位 2 + 1 = 3，得到 37。这里每一位相加都不满十，所以不用进位。'}]},
    {'id': 'subtraction', 'title': '减法竖式（不退位）', 'subtitle': '相同数位相减，算完再检查', 'minutes': None, 'grade': '基础运算', 'kind': 'video', 'sections': [
        {'title': '从个位减起', 'text': '列减法竖式时，相同数位对齐，从个位减起。'},
        {'title': '用加法检查', 'text': '计算 46 − 23：个位 6 − 3 = 3，十位 4 − 2 = 2，得到 23。可以用差加减数是否等于被减数来检查。'}]},
]


def build_coach_messages(system, history, message):
    """The shared provider treats supplied messages as the entire request."""
    return [{'role': 'system', 'content': system}, *history, {'role': 'user', 'content': message}]


def judge(answer: str, expected: str) -> bool:
    def normalize(value):
        value = re.sub(r'\s+', '', unicodedata.normalize('NFKC', value))
        return value.rstrip('。!！?？;；,，')

    given, want = normalize(answer), normalize(expected)
    aliases = {'三(3)位': {'3', '三', '3位', '三位'}, '错': {'错', '错误', '不对', '否', 'false'}, 'B': {'B', 'b', '12'}, '够': {'够', '够了'}, '不合理': {'不合理'}}
    if want in aliases:
        # Credit the explicit result only, never the unverified explanation.
        return re.split(r'[,，。;；:：]', given, maxsplit=1)[0] in aliases[want]
    for alias, unit in [('m2', '平方米'), ('㎡', '平方米'), ('km', '千米'), ('公里', '千米')]:
        if given.lower().endswith(alias):
            given = given[:-len(alias)] + unit
            break
    units = ('平方米', '千米', '元')
    expected_unit = next((unit for unit in units if want.endswith(unit)), None)
    supplied_unit = next((unit for unit in units if given.endswith(unit)), None)
    if supplied_unit and supplied_unit != expected_unit:
        return False
    if expected_unit:
        want = want.removesuffix(expected_unit)
        given = given.removesuffix(expected_unit)
    number = r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)'
    if '=' in given:
        # Accept a simple, true numeric equation; never execute student input.
        match = re.fullmatch(rf'({number})([×*xX+−-])({number})=({number})', given)
        if not match:
            return False
        left, op, right, result = match.groups()
        a, b, result_value = Decimal(left), Decimal(right), Decimal(result)
        calculated = a * b if op in '×*xX' else a + b if op == '+' else a - b
        if calculated != result_value:
            return False
        given = result
    if re.fullmatch(number, given or ' ') and re.fullmatch(number, want or ' '):
        try:
            return Decimal(given) == Decimal(want)
        except InvalidOperation:
            return False
    return given == want


class LearningService:
    def __init__(self, path: Path):
        self.path = path

    def question(self, question_id):
        for question in QUESTIONS:
            if question['id'] == question_id:
                return question
        raise ValueError('题目不存在')

    def lesson(self, lesson_id):
        for lesson in LESSONS:
            if lesson['id'] == lesson_id:
                return lesson
        raise ValueError('课程不存在')

    def _read(self):
        if self.path.exists():
            data = json.loads(self.path.read_text(encoding='utf-8'))
            data.setdefault('reviews', {})
            return data
        return {'version': 1, 'attempts': [], 'hints': {}, 'completed_lessons': [], 'conversations': {}, 'reviews': {}}

    def catalog(self):
        return {'lessons': LESSONS, 'questions': [{k: v for k, v in q.items() if k not in ('answer', 'explanation', 'hint')} for q in QUESTIONS]}

    def state(self):
        with _LOCK:
            data = self._read()
        attempts = data['attempts']
        by_question = {}
        for a in attempts:
            by_question.setdefault(a['question_id'], []).append(a)
        mistakes = []
        for qid, group in by_question.items():
            wrong = [a for a in group if not a['correct']]
            if wrong:
                q = self.question(qid)
                review = self._review_for(qid, data) if group[-1]['correct'] else {'status': 'not_started', 'target_question_id': None}
                mistakes.append({'review_status': review['status'], 'review_question_id': review['target_question_id'], 'question_id': qid, 'prompt': q['prompt'], 'topic': q['topic'], 'lesson_id': q['lesson_id'], 'answer': wrong[-1]['answer'], 'count': len(wrong), 'resolved': group[-1]['correct']})
        independent = sum(1 for group in by_question.values() if group[0]['correct'] and not group[0]['assisted'])
        correct = sum(1 for a in attempts if a['correct'])
        topics = []
        for lesson in LESSONS[:3]:
            ids = {q['id'] for q in QUESTIONS if q['lesson_id'] == lesson['id']}
            tested = [g for qid, g in by_question.items() if qid in ids]
            topics.append({'lesson_id': lesson['id'], 'title': lesson['title'], 'tested': len(tested), 'independent': sum(1 for g in tested if g[0]['correct'] and not g[0]['assisted'])})
        return {**{k: data[k] for k in ('attempts', 'hints', 'completed_lessons')}, 'mistakes': mistakes, 'report': {'attempts': len(attempts), 'questions': len(by_question), 'correct': correct, 'independent_correct': independent, 'independent_rate': round(100 * independent / len(by_question)) if by_question else None, 'topics': topics, 'verified_mistakes': sum(m['review_status'] == 'verified' for m in mistakes), 'pending_verifications': sum(m['resolved'] and m['review_status'] != 'verified' for m in mistakes)}}

    def _next(self, q, data):
        used = {a['question_id'] for a in data['attempts']}
        candidates = [x for x in QUESTIONS if x['id'] != q['id']]
        for pool in ([x for x in candidates if x['topic'] == q['topic'] and x['id'] not in used], [x for x in candidates if x['lesson_id'] == q['lesson_id'] and x['id'] not in used], [x for x in candidates if x['id'] not in used], candidates):
            if pool:
                return pool[0]['id']

    def _review_target(self, source_id, data):
        source = self.question(source_id)
        used = {a['question_id'] for a in data['attempts']} | {qid for qid, level in data['hints'].items() if level}
        return next((q['id'] for q in QUESTIONS if q['id'] != source_id and q['topic'] == source['topic'] and q['id'] not in used), None)

    def _review_for(self, source_id, data):
        review = dict(data.get('reviews', {}).get(source_id, {}))
        if review.get('status') == 'verified':
            return review
        target = review.get('target_question_id')
        # An ordinary visit to the candidate is not a recorded transfer test.
        used_elsewhere = any(a['question_id'] == target and a.get('source_question_id') != source_id for a in data['attempts'])
        if not target or used_elsewhere:
            target = self._review_target(source_id, data)
        return {**review, 'status': review.get('status', 'pending') if target else 'unavailable', 'target_question_id': target}

    def _answer_result(self, attempt, data):
        q = self.question(attempt['question_id'])
        next_id = self._next(q, data)
        used = {a['question_id'] for a in data['attempts']}
        kind = 'review' if next_id in used else 'new'
        source_id = attempt.get('source_question_id') or q['id']
        records = [a for a in data['attempts'] if a['question_id'] == source_id]
        if records and records[-1]['correct'] and any(not a['correct'] for a in records):
            review = self._review_for(source_id, data)
            if review['status'] != 'verified' and review['target_question_id'] and review['target_question_id'] != q['id']:
                return {'attempt': attempt, 'state': self.state(), 'next_question_id': review['target_question_id'], 'next_question_kind': 'verification', 'next_review_source_id': source_id}
        return {'attempt': attempt, 'state': self.state(), 'next_question_id': next_id, 'next_question_kind': kind, 'next_review_source_id': None}

    def submit(self, question_id, answer, attempt_id, source_question_id=None):
        q = self.question(question_id)
        if not answer.strip() or len(answer) > 300:
            raise ValueError('请输入不超过 300 字的答案')
        with _LOCK:
            data = self._read()
            existing = next((a for a in data['attempts'] if a['id'] == attempt_id), None)
            if existing:
                if existing['question_id'] != question_id or existing['answer'] != answer or existing.get('source_question_id') != source_question_id:
                    raise ValueError('提交编号已被使用，请重新提交')
                return self._answer_result(existing, data)
            review = None
            if source_question_id:
                self.question(source_question_id)
                records = [a for a in data['attempts'] if a['question_id'] == source_question_id]
                review = self._review_for(source_question_id, data)
                if not records or not records[-1]['correct'] or not any(not a['correct'] for a in records) or review['status'] == 'verified' or review['target_question_id'] != question_id:
                    raise ValueError('复测题已变化，请从错题本重新进入。')
            previous = [a for a in data['attempts'] if a['question_id'] == question_id]
            attempt = {'id': attempt_id, 'question_id': question_id, 'answer': answer, 'correct': judge(answer, q['answer']), 'assisted': data['hints'].get(question_id, 0) > 0 or bool(previous), 'created_at': datetime.now(timezone.utc).isoformat(), 'checked_scope': 'judgment_only' if q['kind'] == '判断' or q['answer'] in ('够', '不合理') else 'result'}
            if source_question_id:
                attempt['source_question_id'] = source_question_id
            data['attempts'].append(attempt)
            if not attempt['correct']:
                data['reviews'].pop(question_id, None)
            elif any(not a['correct'] for a in previous) and (not previous[-1]['correct'] or question_id not in data['reviews']):
                target = self._review_target(question_id, data)
                data['reviews'][question_id] = {'status': 'pending' if target else 'unavailable', 'target_question_id': target}
            if review is not None:
                passed = attempt['correct'] and not attempt['assisted']
                target = review['target_question_id']
                if attempt['correct'] and not passed:
                    target = self._review_target(source_question_id, data)
                data['reviews'][source_question_id] = {'status': 'verified' if passed else 'needs_practice', 'target_question_id': target, 'attempt_id': attempt_id}
            atomic_write_json(self.path, data)
            return self._answer_result(attempt, data)

    def hint(self, question_id):
        q = self.question(question_id)
        with _LOCK:
            data = self._read()
            level = min(3, data['hints'].get(question_id, 0) + 1)
            data['hints'][question_id] = level
            atomic_write_json(self.path, data)
        second = '先按整数乘法计算，再检查两个因数一共有几位小数。位数不够时，想想在哪里补零。'
        if q['lesson_id'] == 'decimal-check':
            second = '先估计结果的大致范围。如果要比较大小，观察另一个因数比 1 大还是小，再判断积的变化。'
        prompts = [q['hint'] or '先说说你准备怎样计算，我们从第一步开始。', second, q['explanation']]
        return {'level': level, 'text': prompts[level - 1], 'state': self.state()}

    def complete_lesson(self, lesson_id):
        self.lesson(lesson_id)
        with _LOCK:
            data = self._read()
            if lesson_id not in data['completed_lessons']:
                data['completed_lessons'].append(lesson_id)
                atomic_write_json(self.path, data)
        return self.state()

    def mark_assisted(self, question_id):
        self.question(question_id)
        with _LOCK:
            data = self._read()
            data['hints'][question_id] = max(1, data['hints'].get(question_id, 0))
            atomic_write_json(self.path, data)

    def coach_context(self, lesson_id, question_id=None):
        lesson = self.lesson(lesson_id)
        parts = [f"课程：{lesson['title']}"]
        for index, section in enumerate(lesson['sections'], 1):
            parts.append(f"[片段 {index}] {section['title']}：{section['text']}")
        if question_id:
            q = self.question(question_id)
            if q['lesson_id'] != lesson_id:
                raise ValueError('题目与课程不匹配')
            parts.append(f"当前练习：{q['prompt']}\n教师参考答案（不要提前透露）：{q['answer']}\n教师参考解析：{q['explanation']}")
            records = [a for a in self.state()['attempts'] if a['question_id'] == question_id]
            for record in records[-3:]:
                if q['kind'] == '判断' or q['answer'] in ('够', '不合理'):
                    parts.append('程序只核对判断结果；理由尚未核验，不能因结果正确就肯定学生的理由。')
                parts.append(f"已验证的学生作答：{record['answer']}；程序判定：{'正确' if record['correct'] else '不正确'}")
        if lesson['kind'] == 'video':
            parts.append('本课程只有教研知识卡，没有视频转写或画面信息；不能声称看过画面或编造视频时间点。')
        return '\n\n'.join(parts)

    def history(self, key):
        with _LOCK:
            return self._read().get('conversations', {}).get(key, [])[-16:]

    def save_exchange(self, key, message, reply):
        with _LOCK:
            data = self._read()
            history = data.setdefault('conversations', {}).setdefault(key, [])
            history.extend([{'role': 'user', 'content': message}, {'role': 'assistant', 'content': reply}])
            data['conversations'][key] = history[-20:]
            atomic_write_json(self.path, data)
