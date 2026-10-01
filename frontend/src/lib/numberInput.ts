import type { ClipboardEvent, KeyboardEvent } from 'react'

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

export function preventWholeNumberKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) {
    e.preventDefault()
  }
}

export function handleWholeNumberPaste(e: ClipboardEvent<HTMLInputElement>) {
  const pastedText = e.clipboardData.getData('text')
  if (pastedText && !/^\d+$/.test(pastedText.trim())) {
    e.preventDefault()
  }
}

export function clampWholeNumberInput(
  rawValue: string,
  minValue = 1,
  maxValue?: number,
): string | number | undefined {
  if (rawValue === '') {
    return ''
  }

  if (!/^\d+$/.test(rawValue.trim())) {
    return undefined
  }

  const numericValue = Number(rawValue)

  if (!Number.isInteger(numericValue)) {
    return undefined
  }

  if (numericValue < minValue) {
    return minValue
  }

  if (maxValue !== undefined && numericValue > maxValue) {
    return maxValue
  }

  return numericValue
}

export function handleWholeNumberChange(
  rawValue: string,
  onChange: (value: string | number) => void,
  minValue = 1,
  maxValue?: number,
) {
  const clampedValue = clampWholeNumberInput(rawValue, minValue, maxValue)

  if (clampedValue === undefined) {
    return
  }

  onChange(clampedValue)
}
