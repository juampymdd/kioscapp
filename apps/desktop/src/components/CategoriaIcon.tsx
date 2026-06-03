import { icons, Package, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

/** Renderiza un ícono lucide por nombre (PascalCase). Fallback: Package. */
export default function CategoriaIcon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (icons as Record<string, ComponentType<LucideProps>>)[name] ?? Package
  return <Cmp {...props} />
}
