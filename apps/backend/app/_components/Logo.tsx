import Link from 'next/link'

export function BrandMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#2563eb" />
      <rect x="34" y="10" width="8" height="10" rx="1.5" fill="#bfdbfe" />
      <rect x="15" y="16" width="21" height="14" rx="2.5" fill="#ffffff" />
      <rect x="18.5" y="19" width="14" height="8" rx="1.2" fill="#2563eb" />
      <rect x="12" y="29" width="40" height="21" rx="3" fill="#ffffff" />
      <rect x="16" y="34" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="21.5" y="34" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="27" y="34" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="16" y="39.5" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="21.5" y="39.5" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="27" y="39.5" width="3.5" height="3.5" rx="1" fill="#2563eb" />
      <rect x="36.5" y="34" width="11" height="9" rx="1.5" fill="#2563eb" />
    </svg>
  )
}

interface Props {
  href?: string
  markSize?: number
  textClass?: string
  className?: string
}

/** Logo de marca: mark + wordmark. Misma identidad que el desktop. */
export default function Logo({ href = '/', markSize = 28, textClass = 'text-lg', className = '' }: Props) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-bold text-white ${className}`}>
      <BrandMark size={markSize} />
      <span className={textClass}>KioscApp</span>
    </Link>
  )
}
