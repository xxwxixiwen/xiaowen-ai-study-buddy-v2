'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  Target,
} from 'lucide-react'
import CoachPanel from './CoachPanel'
import { studyRequest } from './api'
import type { AnswerResult, Catalog, LearningState, Question } from './types'

export default function PracticePage({
  question,
  catalog,
  state,
  onState,
  reviewSourceId,
}: {
  question?: Question
  reviewSourceId?: string
  catalog: Catalog
  state: LearningState
  onState: (s: LearningState) => void
}) {
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [hint, setHint] = useState<{ text: string; level: number } | null>(null)
  const submission = useRef<{ answer: string; id: string } | null>(null)
  const lesson = catalog.lessons.find(l => l.id === question?.lesson_id)
  if (!question || !lesson) {
    const next = state.mistakes.find(m => !m.resolved)?.question_id || 'T09'
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">自己试一试，才知道有没有想明白</p>
            <h1>
              巩固练习<span className="heading-dot">.</span>
            </h1>
            <p>独立做、慢慢想。需要的时候，再向小文求助。</p>
          </div>
          <span className="pill">
            <Target size={15} /> 30 道精选题
          </span>
        </div>
        <div className="practice-intro">
          <span className="icon-box lavender">
            <Target size={26} />
          </span>
          <div>
            <h2>
              {state.mistakes.some(m => !m.resolved) ? '先把这道错题想明白' : '从一道小数乘法开始'}
            </h2>
            <p>
              {state.mistakes.some(m => !m.resolved)
                ? '从你的真实错题出发，查缺补漏。'
                : '先试着独立完成，卡住了再找小文。'}
            </p>
          </div>
          <Link className="primary-btn" href={`/study/practice/${next}`}>
            开始练习
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="question-library">
          {catalog.lessons.slice(0, 3).map(l => (
            <section key={l.id} className="question-group">
              <div className="section-heading">
                <h2>{l.title}</h2>
                <span className="small-muted">
                  {catalog.questions.filter(q => q.lesson_id === l.id).length} 题
                </span>
              </div>
              {catalog.questions
                .filter(q => q.lesson_id === l.id)
                .map(q => {
                  const attempts = state.attempts.filter(a => a.question_id === q.id)
                  const last = attempts[attempts.length - 1]
                  return (
                    <Link href={`/study/practice/${q.id}`} key={q.id} className="question-row">
                      <span>{q.id}</span>
                      <div>
                        <strong>{q.prompt}</strong>
                        <small>{q.topic}</small>
                      </div>
                      <span className={`question-status ${last?.correct ? 'correct' : ''}`}>
                        {last ? (last.correct ? '已答对' : '再试一次') : '未练习'}
                      </span>
                      <ChevronRight size={15} />
                    </Link>
                  )
                })}
            </section>
          ))}
        </div>
      </>
    )
  }
  const current = question
  const currentLesson = lesson
  const hintCount = state.hints[current.id] || 0
  const sourceMistake = state.mistakes.find(m => m.question_id === reviewSourceId)
  const staleReview = !!reviewSourceId && (!sourceMistake?.resolved || sourceMistake.review_question_id !== current.id || sourceMistake.review_status === 'verified')
  const verified = !!reviewSourceId && result?.state.mistakes.some(m => m.question_id === reviewSourceId && m.review_status === 'verified')
  const nextHref = result?.next_question_id
    ? `/study/practice/${result.next_question_id}${result.next_review_source_id ? `?review=${result.next_review_source_id}` : ''}`
    : '/study/practice'

  async function submit() {
    if (busy || !answer.trim() || staleReview) return
    setBusy(true)
    setError('')
    if (submission.current?.answer !== answer)
      submission.current = {
        answer,
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      }
    try {
      const response = await studyRequest<AnswerResult>('answers', {
        question_id: current.id,
        answer,
        attempt_id: submission.current!.id,
        ...(reviewSourceId ? { source_question_id: reviewSourceId } : {}),
      })
      setResult(response)
      onState(response.state)
    } catch (e) {
      setError(e instanceof Error ? e.message : '答案未保存，请重试。')
    } finally {
      setBusy(false)
    }
  }
  async function getHint() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await studyRequest<{ level: number; text: string; state: LearningState }>(
        'hints',
        { question_id: current.id }
      )
      setHint(response)
      onState(response.state)
    } catch (e) {
      setError(e instanceof Error ? e.message : '提示暂时无法加载。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Link href="/study/practice" className="back-link">
        <ArrowLeft size={15} /> 回到练习目录
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {currentLesson.title} · {current.id}
          </p>
          <h1>
            想一想，再动笔<span className="heading-dot">.</span>
          </h1>
          <p>{reviewSourceId ? `为 ${reviewSourceId} 做同类题复测：先独立完成，需要时仍可求助。` : '把结果写下来，也可以和小文聊聊你的思路。'}</p>
        </div>
        <span className="pill">
          {current.kind} · {'★'.repeat(current.difficulty)}
        </span>
      </div>
      <div className="learning-layout">
        <div className="practice-column">
          <section className="exercise-card">
            <div className="exercise-meta">
              <span>
                <Target size={15} /> {current.topic}
              </span>
              <span>
                {hintCount
                  ? '已使用帮助'
                  : state.attempts.some(a => a.question_id === current.id)
                    ? '已尝试，继续思考'
                    : '先独立试试'}
              </span>
            </div>
            <h2>{current.prompt}</h2>
            {staleReview && !result && (
              <p role="alert" className="inline-error">复测题已变化，请<Link href="/study/mistakes">从错题本重新进入</Link>。</p>
            )}
            <form
              onSubmit={e => {
                e.preventDefault()
                void submit()
              }}
            >
              <label htmlFor="study-answer">我的答案</label>
              <input
                id="study-answer"
                autoComplete="off"
                value={answer}
                maxLength={300}
                disabled={busy || staleReview || result?.attempt.correct}
                onChange={e => {
                  setAnswer(e.target.value)
                  setError('')
                }}
                placeholder={
                  current.kind === '判断'
                    ? '填写“对”或“错”'
                    : current.kind === '选择'
                      ? '填写选项字母，例如 B'
                      : '在这里填写答案'
                }
              />
              <div className="exercise-actions">
                <button
                  className="primary-btn"
                  disabled={
                    busy ||
                    !answer.trim() ||
                    staleReview ||
                    !!result?.attempt.correct ||
                    result?.attempt.answer === answer
                  }
                >
                  {busy ? '处理中…' : '提交答案'}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy || !!result?.attempt.correct}
                  onClick={() => void getHint()}
                >
                  <Lightbulb size={16} />{' '}
                  {hintCount === 0
                    ? '给我一个小提示'
                    : hintCount < 2
                      ? '再给一点提示'
                      : hintCount < 3
                        ? '看看分步讲解'
                        : '再看一次讲解'}
                </button>
              </div>
            </form>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            {result && (
              <div
                className={`answer-feedback ${result.attempt.correct ? 'feedback-correct' : 'feedback-retry'}`}
                role="status"
              >
                <div className="feedback-icon">
                  {result.attempt.correct ? <Check size={23} /> : <RotateCcw size={22} />}
                </div>
                <div>
                  <strong>
                    {verified
                      ? '这次新题独立通过，进步被记录了！'
                      : result.attempt.correct
                        ? result.attempt.assisted ? '这次想明白了，继续验证一下！' : '独立答对了，做得好！'
                        : '这次还不太对，再想一步。'}
                  </strong>
                  <p>
                    {verified
                      ? '这次同类题独立完成，已关联回原错题。一次通过不代表长期稳定掌握。'
                      : !result.attempt.correct
                        ? '先别着急改答案。可以说说计算过程，或使用一个小提示。'
                        : result.next_question_kind === 'verification'
                          ? '订正和独立学会分开记录。换一道未练过的同类题，再验证一次。'
                          : result.next_question_kind === 'review'
                            ? '题库中的题目都练过了，接下来是回顾练习，不是新题复测。'
                            : '这次结果已保存，可以继续练习。没有合适的未练同类题时，不会自动记为复测通过。'}
                  </p>
                  {result.attempt.checked_scope === 'judgment_only' && (
                    <p>这里只核对判断结果，理由尚未验证；可以继续和小文讨论。</p>
                  )}
                  {result.attempt.correct && (
                    <div className="mistake-actions">
                      <Link className="text-btn" href={nextHref}>
                        {result.next_question_kind === 'verification' ? '独立复测一道同类题' : result.next_question_kind === 'review' ? '回顾一道做过的题' : '继续练一道新题'}
                        <ArrowRight size={15} />
                      </Link>
                      <Link className="text-btn" href="/study/report">查看复测记录</Link>
                    </div>
                  )}
                </div>
              </div>
            )}
            {hint && (
              <div className="hint-card">
                <span>
                  <Lightbulb size={16} /> {hint.level === 3 ? '分步讲解' : `小提示 ${hint.level}`}
                </span>
                <p>{hint.text}</p>
              </div>
            )}
          </section>
          <Link className="review-lesson" href={`/study/lesson/${currentLesson.id}`}>
            <span className="icon-box mint">
              <BookOpen size={20} />
            </span>
            <div>
              <strong>回到课程，再理解一下</strong>
              <p>{currentLesson.title}</p>
            </div>
            <ArrowRight size={18} />
          </Link>
          <div className="learning-note">
            <Lightbulb size={17} />
            <p>只有首次独立答对，才会计入独立正确率。用提示后答对也有进步，我们会单独记录。</p>
          </div>
        </div>
        <CoachPanel
          key={current.id}
          lesson={currentLesson}
          question={current}
          onState={onState}
          onReference={() => {
            window.location.href = `/study/lesson/${currentLesson.id}`
          }}
        />
      </div>
    </>
  )
}
