interface Props {
  size?: number
  className?: string
}

/** Ícono de marca KioscApp (logo oficial). Mismo mark que web/favicon. */
export default function BrandMark({ size = 24, className = '' }: Props) {
  return (
    <img
      src="/kioscapp-icon.svg"
      width={size}
      height={size}
      className={className}
      alt="KioscApp"
      draggable={false}
    />
  )
}
