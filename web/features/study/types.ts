export type Section = { title: string; text: string }
export type Lesson = {
  id: string
  title: string
  subtitle: string
  minutes: number | null
  grade: string
  kind: 'interactive' | 'video'
  sections: Section[]
}
export type Question = {
  id: string
  topic: string
  difficulty: number
  kind: string
  lesson_id: string
  prompt: string
}
export type Catalog = { lessons: Lesson[]; questions: Question[] }
export type Attempt = {
  id: string
  question_id: string
  answer: string
  correct: boolean
  assisted: boolean
  created_at: string
  source_question_id?: string
  checked_scope?: 'result' | 'judgment_only'
}
export type Mistake = {
  question_id: string
  prompt: string
  topic: string
  lesson_id: string
  answer: string
  count: number
  resolved: boolean
  review_status: 'not_started' | 'pending' | 'needs_practice' | 'verified' | 'unavailable'
  review_question_id: string | null
}
export type LearningState = {
  attempts: Attempt[]
  hints: Record<string, number>
  completed_lessons: string[]
  mistakes: Mistake[]
  report: {
    attempts: number
    questions: number
    correct: number
    independent_correct: number
    independent_rate: number | null
    verified_mistakes: number
    pending_verifications: number
    topics: { lesson_id: string; title: string; tested: number; independent: number }[]
  }
}
export type AnswerResult = {
  attempt: Attempt
  state: LearningState
  next_question_id: string | null
  next_question_kind: 'new' | 'review' | 'verification'
  next_review_source_id: string | null
}
export type CoachMode = 'auto' | 'explain' | 'hint' | 'demonstrate'
export type Message = { role: 'user' | 'assistant'; content: string }
