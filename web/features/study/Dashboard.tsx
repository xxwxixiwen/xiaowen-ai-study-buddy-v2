import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Check,
  Flag,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import type { Catalog, LearningState } from './types'
import CourseCard from './CourseCard'
import StudyMascot from './StudyMascot'

export default function Dashboard({ catalog, state }: { catalog: Catalog; state: LearningState }) {
  const unresolved = state.mistakes.filter(m => !m.resolved)
  const awaiting = state.mistakes.find(m => m.resolved && m.review_status !== 'verified' && m.review_question_id)
  const nextLesson =
    catalog.lessons.find(l => l.id === unresolved[0]?.lesson_id) ||
    catalog.lessons.find(l => l.id === awaiting?.lesson_id) ||
    catalog.lessons.find(l => !state.completed_lessons.includes(l.id)) ||
    catalog.lessons[0]
  const done = state.completed_lessons.filter(id =>
    catalog.lessons.slice(0, 3).some(l => l.id === id)
  ).length
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">准备好了吗？一起发现新知识</p>
          <h1>
            今天，向新知识出发<span className="heading-dot">.</span>
          </h1>
          <p>和小文一起，看懂一道题，学会一个方法。</p>
        </div>
        <div className="date-chip">
          <span>正在学习</span>
          <strong>小数乘法</strong>
        </div>
      </div>
      <div className="dashboard-top">
        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="banner-tag">
              <Sparkles size={14} /> 你的 AI 学习伙伴
            </span>
            <h2>
              把「我不会」
              <br />
              变成「原来如此！」
            </h2>
            <p>
              看微课，动手练，和小文一起探索。
              <br />
              每一次想明白，都离目标更近一点。
            </p>
            <div className="hero-next-task"><span>今日学习任务</span><strong>{nextLesson.title}</strong></div>
            <Link className="primary-btn" href={`/study/lesson/${nextLesson.id}`}>
              {unresolved.length ? '回顾我的薄弱点' : '开始今天的学习'}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="welcome-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="floating-note note-one">灵感正在发光 ✦</span>
            <div className="mascot-disc">
              <StudyMascot size={330} portrait={false} priority />
            </div>
            <span className="floating-note note-two">0.2 × 0.3 = ?</span>
            <span className="deco-star">✳</span>
          </div>
        </section>
        <section className="unit-card">
          <div className="unit-header">
            <span className="icon-box lavender">
              <Flag size={20} />
            </span>
            <span>我的单元目标</span>
          </div>
          <h3>小数乘法，慢慢拿下</h3>
          <p>理解算理 · 放对小数点 · 学会检查</p>
          <div className="unit-progress">
            <strong>
              {done}
              <small> / 3 节</small>
            </strong>
            <span>课程进度</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(done / 3) * 100}%` }} />
          </div>
          <div className="unit-checks">
            {catalog.lessons.slice(0, 3).map(l => (
              <span key={l.id} className={state.completed_lessons.includes(l.id) ? 'checked' : ''}>
                <i>{state.completed_lessons.includes(l.id) ? <Check size={10} /> : null}</i>
                {l.title}
              </span>
            ))}
          </div>
        </section>
      </div>
      <div className="study-stats">
        <Stat
          icon={<BookOpen size={20} />}
          label="已完成课程"
          value={String(state.completed_lessons.length)}
          unit="节"
          tone="coral"
        />
        <Stat
          icon={<Target size={20} />}
          label="独立首次答对"
          value={String(state.report.independent_correct)}
          unit="题"
          tone="mint"
        />
        <Stat
          icon={<TrendingUp size={20} />}
          label="练过的题目"
          value={String(state.report.questions)}
          unit="题"
          tone="lavender"
        />
        <Stat
          icon={<Lightbulb size={20} />}
          label="待巩固错题"
          value={String(unresolved.length)}
          unit="题"
          tone="yellow"
        />
      </div>
      <div className="dashboard-bottom">
        <section>
          <div className="section-heading">
            <h2>接下来，学点什么？</h2>
            <Link href="/study/courses">
              全部课程
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="course-grid compact">
            {catalog.lessons.slice(0, 3).map((l, i) => (
              <CourseCard
                key={l.id}
                lesson={l}
                index={i}
                complete={state.completed_lessons.includes(l.id)}
              />
            ))}
          </div>
        </section>
        <section className="today-plan">
          <div className="section-heading">
            <h2>今天的小计划</h2>
            <span className="small-muted">循序渐进</span>
          </div>
          <Plan
            n="01"
            title={nextLesson.title}
            text={unresolved.length ? '根据你的错题，回顾相关知识' : '跟着微课，先把道理想明白'}
            href={`/study/lesson/${nextLesson.id}`}
            done={false}
          />
          <Plan
            n="02"
            title={awaiting ? '验证我是否真的会了' : '试试我会不会'}
            text={awaiting ? '原题已订正，用一道未练同类题独立验证' : '独立完成，再决定要不要提示'}
            href={awaiting ? `/study/practice/${awaiting.review_question_id}?review=${awaiting.question_id}` : '/study/practice'}
            done={!awaiting && state.report.questions > 0}
          />
          <Plan
            n="03"
            title="看看我的小进步"
            text="发现收获，也找到下一步"
            href="/study/report"
            done={false}
          />
          <div className="plan-tip">
            <Sparkles size={17} />
            <p>
              {unresolved.length
                ? '计划已根据你的实际错题调整。做完后，再试一道新题。'
                : '先学一节，再练几题。你的作答会帮助小文安排下一步。'}
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function Stat({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  tone: string
}) {
  return (
    <div className="stat-card">
      <span className={`icon-box ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>
          {value}
          <small>{unit}</small>
        </strong>
      </div>
    </div>
  )
}
function Plan({
  n,
  title,
  text,
  href,
  done,
}: {
  n: string
  title: string
  text: string
  href: string
  done: boolean
}) {
  return (
    <Link className="plan-row" href={href}>
      <span className={`plan-number ${done ? 'done' : ''}`}>{done ? <Check size={15} /> : n}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <ArrowRight size={15} />
    </Link>
  )
}
