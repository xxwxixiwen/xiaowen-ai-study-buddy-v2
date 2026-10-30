import StudyApp from '@/features/study/StudyApp'

export default async function StudyPage({ params, searchParams }: {
  params: Promise<{ path?: string[] }>
  searchParams: Promise<{ review?: string | string[] }>
}) {
  const { path = [] } = await params
  const { review } = await searchParams
  return <StudyApp path={path} reviewSourceId={typeof review === 'string' ? review : undefined} />
}
