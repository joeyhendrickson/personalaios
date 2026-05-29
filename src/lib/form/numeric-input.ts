/** Digits-only while typing (works with type="text" + inputMode="numeric" on mobile). */
export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** String value for controlled numeric inputs (allows empty while typing). */
export function toFormNumericString(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return ''
  }
  return String(value)
}

/** Parse integer on submit/blur; use with string form state for number inputs. */
export function parseIntFromForm(
  raw: string,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') {
    return fallback
  }
  const n = parseInt(trimmed, 10)
  if (Number.isNaN(n)) {
    return fallback
  }
  let result = n
  if (options?.min != null) {
    result = Math.max(options.min, result)
  }
  if (options?.max != null) {
    result = Math.min(options.max, result)
  }
  return result
}

/** Parse float on submit/blur; use with string form state for number inputs. */
export function parseFloatFromForm(
  raw: string,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return fallback
  }
  const n = parseFloat(trimmed)
  if (Number.isNaN(n)) {
    return fallback
  }
  let result = n
  if (options?.min != null) {
    result = Math.max(options.min, result)
  }
  if (options?.max != null) {
    result = Math.min(options.max, result)
  }
  return result
}
