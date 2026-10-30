import Link from 'next/link'
import { ArrowRight, Check, Boxes, Grid2X2, Orbit, Plus, Minus } from 'lucide-react'
import type { Lesson } from './types'

export default function CourseCard({
  lesson,
  index,
  complete,
}: {
  lesson: Lesson
  index: number
  complete: boolean
}) {
  const Illustration = [Boxes, Grid2X2, Orbit, Plus, Minus][index % 5]
  return (
    <Link href={`/study/lesson/${lesson.id}`} className="course-card">
      <div className={`course-art art-${index % 5}`}>
        <span className="art-type">{lesson.kind === 'video' ? '视频微课' : '互动微课'}</span>
        <span className="course-orb course-orb-one" aria-hidden="true" />
        <span className="course-orb course-orb-two" aria-hidden="true" />
        <div className="course-toy" aria-hidden="true"><Illustration size={46} strokeWidth={2.2} /></div>
        <div className="math-art">
          {['2.3 × 3', '0.2 × 0.3', '≈ ?', '23 + 14', '46 − 23'][index % 5]}
        </div>
        <span className="art-doodle">✦</span>
        <span className="course-duration">
          {lesson.minutes ? `约 ${lesson.minutes} 分钟` : '基础运算'}
        </span>
      </div>
      <div className="course-info">
        <div className="course-meta">
          {lesson.grade}
          {complete && (
            <span>
              <Check size={13} /> 已学过
            </span>
          )}
        </div>
        <h3>{lesson.title}</h3>
        <p>{lesson.subtitle}</p>
        <div className="course-cta">
          {complete ? '再巩固一下' : '开始探索'}
          <ArrowRight size={16} />
        </div>
      </div>
    </Link>
  )
}
