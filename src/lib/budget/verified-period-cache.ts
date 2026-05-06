import 'server-only'

import { createHash } from 'crypto'

export type TxFingerprintInput = {
  id: string
  date: string
  amount: number | string
  name: string
  updated_at?: string | null
}

/** Stable hash so any edit/sync to a row in the period invalidates the saved snapshot. */
export function fingerprintTransactionSet(rows: TxFingerprintInput[]): string {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id))
  const payload = sorted
    .map((t) =>
      [t.id, t.date, String(t.amount), (t.name || '').slice(0, 160), t.updated_at || ''].join('|')
    )
    .join('\n')
  return createHash('sha256').update(payload).digest('hex')
}

export type VerifiedPeriodSummary = {
  start_date: string
  end_date: string
  transaction_count: number
  totals: {
    sum_positive: number
    sum_negative: number
    net: number
    total_outflow_abs: number
  }
  plaid_category_rollups: { category: string; total_abs: number }[]
  top_merchants_or_names: { label: string; total_abs: number; count: number }[]
  samples: { date: string; name: string; amount: number }[]
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Compact rollup for AI context (replaces long per-transaction lists when period is verified). */
export function buildVerifiedPeriodSummary(
  startDate: string,
  endDate: string,
  txs: Array<{
    date: string
    amount: number | string
    name: string
    merchant_name?: string | null
    category?: string[] | null
  }>
): VerifiedPeriodSummary {
  let sumPos = 0
  let sumNeg = 0
  let outflowAbs = 0

  const catMap = new Map<string, number>()
  const nameMap = new Map<string, { total: number; count: number }>()

  for (const t of txs) {
    const a = num(t.amount)
    if (a > 0) sumPos += a
    else sumNeg += a
    outflowAbs += a < 0 ? Math.abs(a) : 0

    const cats = Array.isArray(t.category) ? t.category : []
    const primary = String(cats[0] || 'uncategorized')
    catMap.set(primary, (catMap.get(primary) || 0) + Math.abs(a))

    const label = String(t.merchant_name || t.name || 'Unknown').slice(0, 80)
    const cur = nameMap.get(label) || { total: 0, count: 0 }
    cur.total += Math.abs(a)
    cur.count += 1
    nameMap.set(label, cur)
  }

  const plaid_category_rollups = [...catMap.entries()]
    .map(([category, total_abs]) => ({ category, total_abs }))
    .sort((x, y) => y.total_abs - x.total_abs)
    .slice(0, 12)

  const top_merchants_or_names = [...nameMap.entries()]
    .map(([label, v]) => ({ label, total_abs: v.total, count: v.count }))
    .sort((x, y) => y.total_abs - x.total_abs)
    .slice(0, 10)

  const samples = [...txs]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 12)
    .map((t) => ({
      date: String(t.date),
      name: String(t.merchant_name || t.name || '').slice(0, 100),
      amount: num(t.amount),
    }))

  return {
    start_date: startDate,
    end_date: endDate,
    transaction_count: txs.length,
    totals: {
      sum_positive: sumPos,
      sum_negative: sumNeg,
      net: sumPos + sumNeg,
      total_outflow_abs: outflowAbs,
    },
    plaid_category_rollups,
    top_merchants_or_names,
    samples,
  }
}
