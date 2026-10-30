'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, LoaderCircle, Send, Sparkles } from 'lucide-react'
import { studyRequest } from './api'
import StudyMascot from './StudyMascot'
import type { CoachMode, LearningState, Lesson, Message, Question } from './types'

export default function CoachPanel({
  lesson,
  question,
  onState,
  onReference,
}: {
  lesson: Lesson
  question?: Question
  onState: (state: LearningState) => void
  onReference?: (index: number) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const activeRequest = useRef<AbortController | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const c = new AbortController()
    const query = new URLSearchParams({
      lesson_id: lesson.id,
      ...(question ? { question_id: question.id } : {}),
    })
    studyRequest<{ messages: Message[] }>(`coach/history?${query}`, undefined, c.signal)
      .then(r => {
        setMessages(r.messages)
        setLoading(false)
      })
      .catch(() => {
        if (!c.signal.aborted) {
          setError('历史对话暂时没有加载，仍可继续提问。')
          setLoading(false)
        }
      })
    return () => {
      c.abort()
      activeRequest.current?.abort()
    }
  }, [lesson.id, question])
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [messages, busy])
  async function send(message: string, mode: CoachMode = 'auto') {
    if (!message.trim() || busy || loading) return
    setError('')
    setBusy(true)
    setText('')
    setMessages(prev => [...prev, { role: 'user', content: message }])
    const c = new AbortController()
    activeRequest.current = c
    const timeout = setTimeout(() => c.abort(), 55000)
    try {
      const result = await studyRequest<{ reply: string; state: LearningState }>(
        'coach',
        { lesson_id: lesson.id, question_id: question?.id, message, mode },
        c.signal,
        55000
      )
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }])
      onState(result.state)
    } catch (e) {
      if (activeRequest.current === c) {
        setMessages(prev => prev.slice(0, -1))
        setText(message)
        setError(
          e instanceof Error && e.name !== 'AbortError'
            ? e.message
            : '这次等待有些久，请重试。你也可以先用题目提示。'
        )
      }
    } finally {
      clearTimeout(timeout)
      if (activeRequest.current === c) {
        setBusy(false)
        activeRequest.current = null
      }
    }
  }
  const suggestions: { label: string; message: string; mode: CoachMode }[] = question
    ? [
        { label: '换一种讲法', message: '请换一种容易理解的方式解释这道题涉及的方法，不要直接给最终答案。', mode: 'explain' },
        { label: '给一个提示', message: '请根据我已有的步骤，给我一个小提示。', mode: 'hint' },
        { label: '示范第一步', message: '我卡住了，请直接示范第一步，把这一小步的过程写出来，后面让我自己做。', mode: 'demonstrate' },
      ]
    : [
        { label: '换一种讲法', message: '请换一种容易理解的方式解释本节课程，用一个生活中的例子。', mode: 'explain' },
        { label: '示范第一步', message: '请用本节课的一个例子示范第一步，再让我接着试试。', mode: 'demonstrate' },
      ]
  function renderReply(content: string) {
    return content.split(/(\[片段\s*\d+\]|\*\*[^*]+\*\*)/g).map((part, i) => {
      const match = part.match(/^\[片段\s*(\d+)\]$/)
      if (match && Number(match[1]) <= lesson.sections.length && onReference)
        return (
          <button key={i} className="source-link" onClick={() => onReference(Number(match[1]) - 1)}>
            {part}
          </button>
        )
      if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
      return <span key={i}>{part}</span>
    })
  }
  return (
    <section className="coach-panel" aria-label="小文学伴问答">
      <header className="coach-header">
        <StudyMascot size={54} />
        <div>
          <strong>小文陪你想</strong>
          <p>
            <Sparkles size={11} /> {question ? '围绕这道题，一步一步来' : '结合本节课程，一起探索'}
          </p>
        </div>
        <span className="ai-badge">AI</span>
      </header>
      <div className="coach-sources">
        <BookOpen size={13} />
        <span>
          学习依据：{lesson.title} · {lesson.sections.length} 张知识卡
        </span>
      </div>
      <div className="coach-messages" aria-live="polite">
        <div className="coach-bubble assistant">
          {question
            ? '先别急着算。你准备从哪一步开始？把你的想法告诉我吧。'
            : '嗨，我是小文。刚才哪一点让你有些疑惑？告诉我，我们一起想明白。'}
        </div>
        {loading && <p className="small-muted">正在读取上次的对话…</p>}
        {messages.map((m, i) => (
          <div key={i} className={`coach-bubble ${m.role}`}>
            <span className="message-role">{m.role === 'assistant' ? '小文' : '我'}</span>
            {renderReply(m.content)}
          </div>
        ))}
        {busy && (
          <div className="coach-thinking">
            <LoaderCircle size={14} className="spin" /> 小文正在认真想…
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="coach-composer">
        <div className="coach-suggestions" aria-label="选择需要的帮助">
          {suggestions.map(s => (
            <button key={s.mode} disabled={busy || loading} onClick={() => void send(s.message, s.mode)}>
              {s.mode === 'explain' ? <BookOpen size={14} /> : <Sparkles size={14} />}
              {s.label}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <form
          onSubmit={e => {
            e.preventDefault()
            void send(text)
          }}
        >
          <textarea
            aria-label="告诉小文你的想法"
            placeholder="把你的问题或想法告诉小文…"
            value={text}
            maxLength={1500}
            onChange={e => setText(e.target.value)}
            disabled={busy || loading}
            rows={2}
          />
          <button
            className="send-btn"
            aria-label="发送给小文"
            disabled={busy || loading || !text.trim()}
          >
            <Send size={17} />
          </button>
        </form>
        <p className="coach-footnote">AI 也可能出错，重要结论记得自己再验证。</p>
      </div>
    </section>
  )
}
