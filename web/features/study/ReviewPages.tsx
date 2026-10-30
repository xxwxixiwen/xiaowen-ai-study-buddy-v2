'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Flag,
  Lightbulb,
  NotebookPen,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { LearningState } from './types'

export function MistakesPage({ state }: { state: LearningState }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'verified'>('all')
  const pending = state.mistakes.filter(m => !m.resolved).length
  const mistakes = state.mistakes.filter(
    m => filter === 'all' || (filter === 'verified' ? m.review_status === 'verified' : filter === 'resolved' ? m.resolved : !m.resolved)
  )
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">每一道错题，都是下一次进步的起点</p>
          <h1>
            我的错题<span className="heading-dot">.</span>
          </h1>
          <p>找到卡住的地方，重新试试，比记住答案更有用。</p>
        </div>
        <span className="pill">
          <CircleHelp size={15} /> {pending} 题待订正
        </span>
      </div>
      <div className="study-tabs" aria-label="错题筛选">
        {(
          [
            { value: 'all', label: `全部错题 ${state.mistakes.length}` },
            { value: 'pending', label: `待订正 ${pending}` },
            { value: 'resolved', label: `已订正 ${state.mistakes.length - pending}` },
            { value: 'verified', label: `复测通过 ${state.report.verified_mistakes}` },
          ] as const
        ).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={filter === f.value ? 'selected' : ''}
          >
            {f.label}
          </button>
        ))}
      </div>
      {mistakes.length === 0 ? (
        <div className="study-empty card">
          <span className="icon-box mint">
            <NotebookPen size={28} />
          </span>
          <h2>{state.mistakes.length ? '这个分类还没有错题' : '错题本准备好了'}</h2>
          <p>
            练习中答错的题目会自动收在这里。
            <br />
            不用担心犯错，我们一起把它想明白。
          </p>
          <Link className="primary-btn" href="/study/practice">
            去练一练
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="mistake-list">
          {mistakes.map(m => (
            <article key={m.question_id} className="mistake-card" data-review-status={m.review_status}>
              <div className="mistake-top">
                <span className="pill">{m.topic}</span>
                <span className={m.resolved ? 'resolved-label' : 'pending-label'}>
                  {m.review_status === 'verified'
                    ? <><Check size={14} /> 新题独立通过</>
                    : !m.resolved ? '待订正'
                    : m.review_status === 'unavailable' ? '已订正，暂无未练同类题'
                    : m.review_status === 'needs_practice' ? '已订正，复测还需练习'
                    : '已订正，待独立复测'}
                </span>
              </div>
              <h2>{m.prompt}</h2>
              <div className="mistake-answer">
                上次错误答案：<strong>{m.answer}</strong>
                <span>共答错 {m.count} 次</span>
              </div>
              <p className="mistake-note">
                <Lightbulb size={15} /> {m.review_status === 'verified' ? '这次同类题已独立完成，之后仍需复习巩固。' : m.review_status === 'unavailable' ? '当前题库没有未练过的同类题，先回顾知识点，不会自动标为掌握。' : '订正后再独立完成一道未练同类题，才能记录复测通过。'}
              </p>
              <div className="mistake-actions">
                <Link className="primary-btn" href={m.resolved && m.review_status !== 'verified' && m.review_question_id ? `/study/practice/${m.review_question_id}?review=${m.question_id}` : `/study/practice/${m.question_id}`}>
                  {m.resolved && m.review_status !== 'verified' && m.review_question_id ? '独立复测' : '再练原题'}
                  <ArrowRight size={15} />
                </Link>
                <Link className="secondary-btn" href={`/study/lesson/${m.lesson_id}`}>
                  <BookOpen size={15} /> 回顾知识点
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export function ReportPage({ state }: { state: LearningState }) {
  const report = state.report
  const corrected = state.mistakes.filter(m => m.resolved).length
  const pending = state.mistakes.filter(m => !m.resolved)
  const awaiting = state.mistakes.find(m => m.resolved && m.review_status !== 'verified' && m.review_question_id)
  const recent = [...state.attempts].reverse().slice(0, 8)
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">让努力有迹可循</p>
          <h1>
            学习报告<span className="heading-dot">.</span>
          </h1>
          <p>根据当前账号的真实学习记录更新，每一步都算数。</p>
        </div>
        <span className="pill">
          <TrendingUp size={15} /> 累计学习记录
        </span>
      </div>
      <div className="report-banner">
        <div>
          <span className="banner-tag">
            <Flag size={14} /> 小文的学习观察
          </span>
          <h2>
            {report.questions === 0
              ? '先开始，进步就会发生'
              : pending.length
                ? `还有 ${pending.length} 道题，值得再想一想`
                : report.pending_verifications ? '已经订正，再独立验证一次' : '今天的努力，已经留下了痕迹'}
          </h2>
          <p>
            {report.questions === 0
              ? '学完一节微课，独立完成几道题，这里就会出现你的学习反馈。'
              : `你练过 ${report.questions} 道题，首次独立答对 ${report.independent_correct} 道，已订正 ${corrected} 道错题，其中 ${report.verified_mistakes} 道已有新题独立通过记录。`}
          </p>
        </div>
        <span className="report-banner-symbol">✳</span>
      </div>
      <div className="study-stats">
        <Metric
          title="练过的题目"
          number={report.questions}
          unit="题"
          icon={<NotebookPen size={21} />}
        />
        <Metric
          title="首次独立正确率"
          number={report.independent_rate === null ? '—' : report.independent_rate}
          unit={report.independent_rate === null ? '' : '%'}
          icon={<Target size={21} />}
        />
        <Metric title="已订正错题" number={corrected} unit="题" icon={<Check size={21} />} />
        <Metric
          title="已完成课程"
          number={state.completed_lessons.length}
          unit="节"
          icon={<BookOpen size={21} />}
        />
      </div>
      <section className="card verification-summary">
        <div className="section-heading">
          <h2>错题复测进展</h2>
          <span className="pill">新题独立通过 {report.verified_mistakes} 题</span>
        </div>
        <p>已订正 {corrected} 题 · 待独立验证 {report.pending_verifications} 题</p>
        <p className="small-muted">保留首次表现，也记录后来独立完成新题的进步。复测通过仅代表本轮表现，不等于长期掌握。</p>
      </section>
      <div className="report-grid">
        <section className="card report-topics">
          <div className="section-heading">
            <h2>知识点练习情况</h2>
          </div>
          <p className="small-muted">首次独立答对 / 练过的题目，少量练习不代表稳定掌握。</p>
          {report.topics.map(t => (
            <Link href={`/study/lesson/${t.lesson_id}`} className="topic-row" key={t.lesson_id}>
              <div>
                <strong>{t.title}</strong>
                <span>
                  {t.tested ? `${t.independent} / ${t.tested} 题独立答对` : '还没有练习记录'}
                </span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${t.tested ? (t.independent / t.tested) * 100 : 0}%` }} />
              </div>
            </Link>
          ))}
          <div className="learning-note">
            <Lightbulb size={17} />
            <p>提示后答对和重新作答会被记录，但不会提高首次独立正确率。</p>
          </div>
        </section>
        <section className="card report-next">
          <span className="icon-box yellow">
            <Lightbulb size={23} />
          </span>
          <h2>接下来，试试这样学</h2>
          {pending.length ? (
            <>
              <p>先回顾「{pending[0].topic}」相关课程，重新练习，再独立做一道同类新题。</p>
              <Link className="primary-btn" href={`/study/lesson/${pending[0].lesson_id}`}>
                去回顾知识点
                <ArrowRight size={16} />
              </Link>
            </>
          ) : awaiting ? (
            <>
              <p>「{awaiting.topic}」原题已经订正。下一步独立做一道未练过的同类题，验证是否真的想明白。</p>
              <Link className="primary-btn" href={`/study/practice/${awaiting.review_question_id}?review=${awaiting.question_id}`}>
                去独立复测 <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <p>
                {report.questions
                  ? '继续尝试还没练过的题目。换一道题，也能自己讲清楚，理解才更扎实。'
                  : '从小数乘小数开始，先观察方格，再试着计算。'}
              </p>
              <Link
                className="primary-btn"
                href={report.questions ? '/study/practice' : '/study/lesson/decimal-decimal'}
              >
                继续我的学习
                <ArrowRight size={16} />
              </Link>
            </>
          )}
          <small>建议依据：当前课程完成情况与错题记录</small>
        </section>
      </div>
      <section className="card recent-records">
        <div className="section-heading">
          <h2>最近的作答</h2>
          <Link href="/study/practice">
            继续练习
            <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length ? (
          <div className="records-table">
            <div className="record-row table-head">
              <span>题目</span>
              <span>我的答案</span>
              <span>结果</span>
              <span>完成方式</span>
            </div>
            {recent.map(a => (
              <div className="record-row" key={a.id}>
                <Link href={`/study/practice/${a.question_id}`}>{a.question_id}</Link>
                <span>{a.answer}</span>
                <span className={a.correct ? 'resolved-label' : 'pending-label'}>
                  {a.correct ? '答对' : '再想想'}
                </span>
                <span>{a.source_question_id ? `${a.source_question_id}的复测 · ` : ''}{a.assisted ? '使用帮助或再次尝试' : '独立首次尝试'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-inline">还没有作答记录。准备好了，就去试一题吧。</p>
        )}
      </section>
    </>
  )
}

function Metric({
  title,
  number,
  unit,
  icon,
}: {
  title: string
  number: number | string
  unit: string
  icon: React.ReactNode
}) {
  return (
    <div className="stat-card">
      <span className="icon-box lavender">{icon}</span>
      <div>
        <p>{title}</p>
        <strong>
          {number}
          <small>{unit}</small>
        </strong>
      </div>
    </div>
  )
}
