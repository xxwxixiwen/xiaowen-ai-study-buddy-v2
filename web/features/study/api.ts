import { apiFetch } from '@/shared/api/client'

export async function studyRequest<T>(
  path: string,
  body?: object,
  signal?: AbortSignal,
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) cancel()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  try {
    const response = await apiFetch(`/api/k12/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    if (!response.ok) {
      if (response.status === 401) throw new Error('请先登录，再继续学习。')
      const error = await response.json().catch(() => ({}))
      throw new Error(typeof error.detail === 'string' ? error.detail : '暂时无法保存，请稍后再试。')
    }
    return await response.json() as T
  } catch (error) {
    if (timedOut) throw new Error('连接等待较久，请重试。')
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
  }
}
