'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  Home,
  LoaderCircle,
  NotebookPen,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { studyRequest } from './api'
import type { Catalog, LearningState } from './types'
import Dashboard from './Dashboard'
import CourseCard from './CourseCard'
import LessonPage from './LessonPage'
import PracticePage from './PracticePage'
import { MistakesPage, ReportPage } from './ReviewPages'
import './study.css'
import './study-future.css'
import StudyMascot from './StudyMascot'

const nav = [
  { href: '/study', label: '学习首页', icon: Home, key: '' },
  { href: '/study/courses', label: '我的课程', icon: BookOpen, key: 'courses' },
  { href: '/study/practice', label: '巩固练习', icon: NotebookPen, key: 'practice' },
  { href: '/study/mistakes', label: '我的错题', icon: CircleHelp, key: 'mistakes' },
  { href: '/study/report', label: '学习报告', icon: ChartNoAxesCombined, key: 'report' },
]

export default function StudyApp({ path, reviewSourceId }: { path: string[]; reviewSourceId?: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [state, setState] = useState<LearningState | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const section = path[0] || ''
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      studyRequest<Catalog>('catalog', undefined, controller.signal),
      studyRequest<LearningState>('state', undefined, controller.signal),
    ])
      .then(([c, s]) => {
        setCatalog(c)
        setState(s)
        setError('')
      })
      .catch(e => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : '暂时无法连接学习服务。')
      })
    return () => controller.abort()
  }, [retry])
  const active = section === 'lesson' ? 'courses' : section
  const title =
    section === 'lesson' ? '课程学习' : nav.find(n => n.key === active)?.label || '一起学习'
  const lesson = catalog?.lessons.find(l => l.id === path[1])
  const question = catalog?.questions.find(q => q.id === path[1])
  return (
    <div className="study-app" data-section={section || 'home'}>
      <aside className="study-sidebar">
        <Link href="/study" className="study-brand">
          <Image src="/brand/study-mark-v2.svg" alt="" width={39} height={39} />
          <span>
            小文<span className="brand-small">AI 学伴</span>
          </span>
        </Link>
        <div className="study-class">
          <span className="class-icon">5</span>
          <div>
            <strong>小学数学</strong>
            <small>五年级 · 上册</small>
          </div>
          <span className="class-badge">学习中</span>
        </div>
        <p className="nav-caption">我的学习空间</p>
        <nav aria-label="学习导航">
          {nav.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`study-nav-item ${active === n.key ? 'active' : ''}`}
              aria-current={active === n.key ? 'page' : undefined}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
              {n.key === 'mistakes' && !!state?.mistakes.filter(m => !m.resolved).length && (
                <b>{state.mistakes.filter(m => !m.resolved).length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-companion">
            <StudyMascot size={88} alt="小文" />
            <strong>慢慢想，也是一种进步</strong>
            <p>每一个问题，我都陪你一起。</p>
          </div>
          <Link href="/settings" className="settings-link">
            <Settings2 size={17} /> 学习设置
          </Link>
          <span className="sidebar-version">小文 AI 学伴 · 体验版</span>
        </div>
      </aside>
      <div className="study-main">
        <header className="study-topbar">
          <div className="breadcrumb">
            我的学习空间 <span>/</span> <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <span /> 和 AI 学伴一起探索
            </span>
            <div className="student-avatar">同学</div>
          </div>
        </header>
        <main className="study-content">
          {error ? (
            <div className="study-empty">
              <CircleHelp size={38} />
              <h1>学习服务暂时没有连上</h1>
              <p role="alert">{error}</p>
              <button
                className="primary-btn"
                onClick={() => {
                  setError('')
                  setRetry(v => v + 1)
                }}
              >
                重新连接
              </button>
            </div>
          ) : !catalog || !state ? (
            <div className="study-empty">
              <LoaderCircle className="spin" size={32} />
              <p>正在准备你的学习空间…</p>
            </div>
          ) : section === '' ? (
            <Dashboard catalog={catalog} state={state} />
          ) : section === 'courses' ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">一点一点，把知识串起来</p>
                  <h1>
                    我的课程<span className="heading-dot">.</span>
                  </h1>
                  <p>先理解，再练习。每次只专注一个小目标。</p>
                </div>
                <span className="pill">
                  <BookOpen size={15} /> {catalog.lessons.length} 节精选微课
                </span>
              </div>
              <div className="section-heading">
                <h2>
                  小数乘法 <span>五年级上册</span>
                </h2>
              </div>
              <div className="course-grid">
                {catalog.lessons.slice(0, 3).map((l, i) => (
                  <CourseCard
                    key={l.id}
                    lesson={l}
                    index={i}
                    complete={state.completed_lessons.includes(l.id)}
                  />
                ))}
              </div>
              <div className="section-heading spaced">
                <h2>
                  基础运算视频 <span>独立课程</span>
                </h2>
              </div>
              <div className="course-grid">
                {catalog.lessons.slice(3).map((l, i) => (
                  <CourseCard
                    key={l.id}
                    lesson={l}
                    index={i + 3}
                    complete={state.completed_lessons.includes(l.id)}
                  />
                ))}
              </div>
            </>
          ) : section === 'lesson' && lesson ? (
            <LessonPage
              key={lesson.id}
              lesson={lesson}
              catalog={catalog}
              state={state}
              onState={setState}
            />
          ) : section === 'practice' ? (
            <PracticePage
              key={`${question?.id || 'practice'}:${reviewSourceId || ''}`}
              reviewSourceId={reviewSourceId}
              question={question}
              catalog={catalog}
              state={state}
              onState={setState}
            />
          ) : section === 'mistakes' ? (
            <MistakesPage state={state} />
          ) : section === 'report' ? (
            <ReportPage state={state} />
          ) : (
            <div className="study-empty">
              <BookOpen size={38} />
              <h1>这里还没有学习内容</h1>
              <Link className="primary-btn" href="/study/courses">
                去看看课程
              </Link>
            </div>
          )}
        </main>
        <footer className="study-footer">
          <Sparkles size={13} /> 每一次自己想明白，都值得被看见。
        </footer>
      </div>
    </div>
  )
}
