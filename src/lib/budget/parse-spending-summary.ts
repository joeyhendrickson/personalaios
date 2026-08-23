export type AnalysisSpendingTotals = {
  total_income?: number
  total_expenses?: number
  net_savings?: number
  transaction_count?: number
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

export function parseSpendingSummary(raw: unknown): AnalysisSpendingTotals | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  return {
    total_income: asFiniteNumber(record.total_income),
    total_expenses: asFiniteNumber(record.total_expenses),
    net_savings: asFiniteNumber(record.net_savings),
    transaction_count: asFiniteNumber(record.transaction_count),
  }
}
