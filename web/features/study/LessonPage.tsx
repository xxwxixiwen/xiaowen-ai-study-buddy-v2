'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Lightbulb, Play, Sparkles } from 'lucide-react'
import CoachPanel from './CoachPanel'
import { studyRequest } from './api'
import type { Catalog, LearningState, Lesson } from './types'

export default function LessonPage({
  lesson,
  catalog,
  state,
  onState,
}: {
  lesson: Lesson
  catalog: Catalog
  state: LearningState
  onState: (s: LearningState) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [videoError, setVideoError] = useState(false)
  const [highlight, setHighlight] = useState<number | null>(null)
  const sections = useRef<(HTMLElement | null)[]>([])
  const router = useRouter()
  const firstQuestion = catalog.questions.find(
    q =>
      q.id ===
      (
        { 'decimal-int': 'T01', 'decimal-decimal': 'T09', 'decimal-check': 'T21' } as Record<
          string,
          string
        >
      )[lesson.id]
  )
  async function finish() {
    setBusy(true)
    setError('')
    try {
      const result = await studyRequest<LearningState>('lessons/complete', { lesson_id: lesson.id })
      onState(result)
      router.push(firstQuestion ? `/study/practice/${firstQuestion.id}` : '/study/courses')
    } catch (e) {
      setError(e instanceof Error ? e.message : '进度未保存，请重试。')
      setBusy(false)
    }
  }
  function reference(index: number) {
    setHighlight(index)
    sections.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return (
    <>
      <Link href="/study/courses" className="back-link">
        <ArrowLeft size={15} /> 回到我的课程
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {lesson.grade} · {lesson.kind === 'video' ? '视频微课' : '互动微课'}
          </p>
          <h1>
            {lesson.title}
            <span className="heading-dot">.</span>
          </h1>
          <p>{lesson.subtitle}</p>
        </div>
        {state.completed_lessons.includes(lesson.id) && (
          <span className="pill mint">
            <Check size={14} /> 已记录学习
          </span>
        )}
      </div>
      <div className="learning-layout">
        <div className="lesson-column">
          {lesson.kind === 'video' ? (
            <div className="video-shell">
              <video
                controls
                preload="metadata"
                src={`/api/k12/media/${lesson.id}`}
                onError={() => setVideoError(true)}
                aria-label={lesson.title}
              />
              {videoError && <p role="alert">视频暂时无法播放，可以先阅读下方知识卡。</p>}
              <div className="video-caption">
                <Play size={14} /> {lesson.title}
                <span>下方知识卡可配合视频阅读</span>
              </div>
            </div>
          ) : lesson.id === 'decimal-decimal' ? (
            <DecimalLab />
          ) : (
            <div className={`concept-hero ${lesson.id === 'decimal-check' ? 'concept-mint' : ''}`}>
              <span className="banner-tag">
                <Lightbulb size={14} /> 先想一想
              </span>
              <h2>
                {lesson.id === 'decimal-int' ? '2.3 元 × 3 支 = ?' : '乘出来的数，一定更大吗？'}
              </h2>
              <p>
                {lesson.id === 'decimal-int'
                  ? '如果换成“角”来算，会不会熟悉一点？'
                  : '把 3.2 分别乘 0.9 和 1.1，观察它们的变化。'}
              </p>
              <div className="concept-equation">
                {lesson.id === 'decimal-int' ? '23 角 × 3 = 69 角' : '3.2 × 0.9 < 3.2 × 1.1'}
              </div>
            </div>
          )}
          <div className="section-heading spaced">
            <h2>一起把道理想明白</h2>
            <span className="small-muted">{lesson.sections.length} 张知识卡</span>
          </div>
          {lesson.sections.map((s, i) => (
            <article
              key={s.title}
              id={`section-${i}`}
              ref={el => {
                sections.current[i] = el
              }}
              className={`knowledge-card ${highlight === i ? 'highlighted' : ''}`}
            >
              <span className="knowledge-number">0{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <button className="text-btn" onClick={() => reference(i)}>
                  <BookFragment /> 片段 {i + 1}
                </button>
              </div>
            </article>
          ))}
          <div className="lesson-complete">
            <div>
              <strong>看懂了？自己试一试</strong>
              <p>用一道题，检查刚才有没有想明白。</p>
            </div>
            <button className="primary-btn" disabled={busy} onClick={() => void finish()}>
              {busy ? '保存中…' : firstQuestion ? '记录学习，去练一练' : '记录本节学习'}
              <ArrowRight size={16} />
            </button>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <CoachPanel lesson={lesson} onState={onState} onReference={reference} />
      </div>
    </>
  )
}
function BookFragment() {
  return <Sparkles size={12} />
}

function DecimalLab() {
  const [width, setWidth] = useState(2)
  const [height, setHeight] = useState(3)
  return (
    <section className="decimal-lab">
      <div>
        <span className="banner-tag">
          <Sparkles size={14} /> 动手发现
        </span>
        <h2>小数相乘，藏在方格里</h2>
        <p>
          整个正方形是 1，每个小方格是 0.01。
          <br />
          拖动滑块，看看重叠的面积。
        </p>
        <div className="lab-equation">
          0.{width} <span>×</span> 0.{height} <span>=</span>{' '}
          <strong>{((width * height) / 100).toFixed(2)}</strong>
        </div>
        <label>
          宽度 <strong>0.{width}</strong>
          <input
            aria-label="方格宽度"
            type="range"
            min="1"
            max="9"
            value={width}
            onChange={e => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          高度 <strong>0.{height}</strong>
          <input
            aria-label="方格高度"
            type="range"
            min="1"
            max="9"
            value={height}
            onChange={e => setHeight(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="lab-grid-wrap">
        <div
          className="lab-grid"
          role="img"
          aria-label={`100个方格中，重叠${width * height}个，占${((width * height) / 100).toFixed(2)}`}
        >
          {Array.from({ length: 100 }, (_, i) => (
            <i
              key={i}
              className={
                i % 10 < width && Math.floor(i / 10) < height
                  ? 'overlap'
                  : i % 10 < width
                    ? 'width-shade'
                    : Math.floor(i / 10) < height
                      ? 'height-shade'
                      : ''
              }
            />
          ))}
        </div>
        <p>
          <span /> 重叠 {width * height} 个小方格
        </p>
      </div>
    </section>
  )
}
