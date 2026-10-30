import { expect, it, vi } from 'vitest'
import { apiFetch } from '@/shared/api/client'
import { studyRequest } from '@/features/study/api'
vi.mock('@/shared/api/client', () => ({ apiFetch: vi.fn() }))

it.each([false, true])('stops a stalled request, including caller-supplied signals: %s', async (external) => {
  vi.useFakeTimers()
  try {
    let aborted = false
    vi.mocked(apiFetch).mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        aborted = true
        reject(new DOMException('aborted', 'AbortError'))
      })
    }))
    const outcome = studyRequest('state', undefined, external ? new AbortController().signal : undefined).then(() => '', e => e.message)
    await vi.advanceTimersByTimeAsync(15001)
    expect(aborted).toBe(true)
    expect(await outcome).toMatch(/等待.*重试/)
  } finally {
    vi.useRealTimers()
  }
})
