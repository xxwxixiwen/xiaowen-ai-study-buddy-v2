import Image from 'next/image'

export default function StudyMascot({
  size = 64,
  portrait = true,
  alt = '',
  priority = false,
}: {
  size?: number
  portrait?: boolean
  alt?: string
  priority?: boolean
}) {
  return (
    <span
      className={`study-mascot ${portrait ? 'mascot-portrait' : 'mascot-full'}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/xiaowen-3d-v1.png"
        alt={alt}
        width={size}
        height={size}
        sizes={`${portrait ? size * 2 : size}px`}
        priority={priority}
      />
    </span>
  )
}
