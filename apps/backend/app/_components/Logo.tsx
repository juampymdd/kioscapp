import Link from 'next/link'

/** Solo el ícono de marca (logo oficial). */
export function BrandMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/kioscapp-icon.svg" width={size} height={size} className={className} alt="KioscApp" />
}

interface Props {
  href?: string
  markSize?: number
  textClass?: string
  className?: string
}

/** Logo de marca horizontal (ícono + wordmark oficial). Para fondos oscuros. */
export default function Logo({ href = '/', markSize = 28, className = '' }: Props) {
  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="KioscApp">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/kioscapp-logo.svg" height={markSize} alt="KioscApp" style={{ height: markSize, width: 'auto' }} />
    </Link>
  )
}
