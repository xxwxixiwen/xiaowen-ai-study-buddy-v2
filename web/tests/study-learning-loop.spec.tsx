import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { apiFetch } from '@/shared/api/client'
import { MistakesPage, ReportPage } from '@/features/study/ReviewPages'
import PracticePage from '@/features/study/PracticePage'
import CoachPanel from '@/features/study/CoachPanel'
import type { Catalog, LearningState } from '@/features/study/types'

vi.mock('@/shared/api/client', () => ({ apiFetch: vi.fn() }))
const catalog: Catalog = {
  lessons: [{ id: 'decimal-decimal', title: '小数乘小数', subtitle: '', grade: '五上', minutes: 10, kind: 'interactive', sections: [{ title: '方格', text: '每格0.01' }] }],
  questions: [
    { id: 'T09', topic: '小数乘小数（补0）', difficulty: 1, kind: '口算', lesson_id: 'decimal-decimal', prompt: '0.2×0.3=?' },
    { id: 'T10', topic: '小数乘小数（补0）', difficulty: 1, kind: '口算', lesson_id: 'decimal-decimal', prompt: '0.1×0.1=?' },
  ],
}
function progress(): LearningState {
  return {
    attempts: [], hints: {}, completed_lessons: [],
    mistakes: [{ question_id: 'T09', prompt: '0.2×0.3=?', topic: '小数乘小数（补0）', lesson_id: 'decimal-decimal', answer: '0.6', count: 1, resolved: true, review_status: 'pending', review_question_id: 'T10' }],
    report: { attempts: 2, questions: 1, correct: 1, independent_correct: 0, independent_rate: 0, topics: [], verified_mistakes: 0, pending_verifications: 1 },
  }
}
function json(value: unknown) { return new Response(JSON.stringify(value), { status: 200 }) }
beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockResolvedValue(json({ messages: [] }))
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
})

it('offers the linked fresh question after correction and distinguishes a verified mistake', () => {
  const state = progress()
  const view = render(<MistakesPage state={state} />)
  expect(screen.getByRole('link', { name: /独立复测/ })).toHaveAttribute('href', '/study/practice/T10?review=T09')
  state.mistakes[0].review_status = 'verified'
  view.rerender(<MistakesPage state={state} />)
  expect(screen.getByText(/新题独立通过/)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /独立复测/ })).not.toBeInTheDocument()
})

it('uses pending transfer evidence for the report next action instead of repeating the corrected question', () => {
  render(<ReportPage state={progress()} />)
  expect(screen.getByRole('link', { name: /去独立复测/ })).toHaveAttribute('href', '/study/practice/T10?review=T09')
  expect(screen.getByText('新题独立通过 0 题')).toBeInTheDocument()
})

it('submits the source relationship and shows transfer success rather than claiming stable mastery', async () => {
  const state = progress()
  const passed = progress()
  passed.mistakes[0].review_status = 'verified'
  passed.report.verified_mistakes = 1
  passed.report.pending_verifications = 0
  let submitted: Record<string, unknown> | undefined
  vi.mocked(apiFetch).mockImplementation(async (url, init) => {
    if (String(url).endsWith('/answers')) {
      submitted = JSON.parse(String(init?.body))
      return json({ attempt: { id: 'v', question_id: 'T10', answer: '0.01', correct: true, assisted: false, source_question_id: 'T09', checked_scope: 'result', created_at: '' }, state: passed, next_question_id: 'T07', next_question_kind: 'new', next_review_source_id: null })
    }
    return json({ messages: [] })
  })
  render(<PracticePage question={catalog.questions[1]} catalog={catalog} state={state} onState={() => {}} reviewSourceId="T09" />)
  fireEvent.change(screen.getByLabelText('我的答案'), { target: { value: '0.01' } })
  fireEvent.click(screen.getByRole('button', { name: /提交答案/ }))
  await waitFor(() => expect(screen.getByText(/这次新题独立通过/)).toBeInTheDocument())
  expect(submitted?.source_question_id).toBe('T09')
  expect(screen.getByRole('link', { name: /查看复测记录/ })).toHaveAttribute('href', '/study/report')
})

it('calls the AI only after an explicit demonstration request and displays the reply', async () => {
  const calls: Array<Record<string, unknown>> = []
  vi.mocked(apiFetch).mockImplementation(async (_url, init) => {
    if (init?.method === 'POST') {
      calls.push(JSON.parse(String(init.body)))
      return json({ reply: '先算2×3=6，下一步再还原大小。', mode: 'demonstrate', state: progress() })
    }
    return json({ messages: [] })
  })
  render(<CoachPanel lesson={catalog.lessons[0]} question={catalog.questions[0]} onState={() => {}} />)
  const button = await screen.findByRole('button', { name: '示范第一步' })
  await waitFor(() => expect(button).toBeEnabled())
  expect(calls).toHaveLength(0)
  fireEvent.click(button)
  expect(await screen.findByText('先算2×3=6，下一步再还原大小。')).toBeInTheDocument()
  expect(calls).toHaveLength(1)
  expect(calls[0].mode).toBe('demonstrate')
})
