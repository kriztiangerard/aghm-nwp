export function sanitizeNumberInput(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  const trimmed = value.trim()

  if (trimmed === '') {
    return undefined
  }

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? parsed : undefined
}
