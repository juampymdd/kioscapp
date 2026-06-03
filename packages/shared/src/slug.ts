/** Slug ASCII en snake_case para id de categoría. */
export function normalizarSlug(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // sacar diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || 'categoria'
}
