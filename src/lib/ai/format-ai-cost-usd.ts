/**
 * Stored AI cost estimates use 4-decimal fractional dollars in Postgres.
 * Shift two decimal places for user-facing display (e.g. 0.4392 → 43.92).
 */
export function normalizeAiCostUsdForDisplay(
  storedUsd: number | string | null | undefined
): number | null {
  if (storedUsd == null || storedUsd === '') return null
  const n = Number(storedUsd)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100 * 100) / 100
}

/** Format display-ready USD amounts with standard 2 decimal places. */
export function formatAiCostUsd(displayUsd: number | string | null | undefined): string {
  const n =
    typeof displayUsd === 'string' || typeof displayUsd === 'number'
      ? Number(displayUsd)
      : displayUsd
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function normalizeAiCostMapForDisplay(map: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(map)) {
    out[key] = normalizeAiCostUsdForDisplay(value) ?? 0
  }
  return out
}
