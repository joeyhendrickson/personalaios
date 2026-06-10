/**
 * Classify transactions for AI context using user overrides (Budget Manager).
 */
import {
  effectiveTransactionAmount,
  type TransactionTypeOverride,
} from '@/lib/budget/transaction-overrides'

const TRADING_MERCHANT_PATTERNS = [
  'webull',
  'robinhood',
  'td ameritrade',
  'etrade',
  'fidelity',
  'schwab',
  'coinbase',
  'interactive brokers',
  'moomoo',
  'public.com',
  'sofi invest',
]

export type ClassifiedTransaction = {
  id: string
  date: string
  name: string
  amount: number
  sourceAmount: number
  category?: string
  typeOverride: TransactionTypeOverride | null
  kind: 'income' | 'expense' | 'transfer'
  isTradingTransfer: boolean
}

export function isTradingPlatformLabel(name: string, merchant?: string): boolean {
  const label = `${name} ${merchant ?? ''}`.toLowerCase()
  return TRADING_MERCHANT_PATTERNS.some((p) => label.includes(p))
}

export function classifyTransactionForContext(row: {
  id: string
  date: string
  amount: number
  name?: string
  merchant_name?: string
  category?: string[] | string
  type_override?: TransactionTypeOverride | null
  amount_override?: number | null
}): ClassifiedTransaction {
  const sourceAmount = Number(row.amount)
  const effectiveAmount = effectiveTransactionAmount(sourceAmount, row.amount_override ?? null)
  const name = row.name || row.merchant_name || 'Unknown'
  const category = Array.isArray(row.category) ? row.category[0] : row.category
  const override = row.type_override ?? null

  let kind: ClassifiedTransaction['kind']
  if (override === 'transfer') {
    kind = 'transfer'
  } else if (override === 'income') {
    kind = 'income'
  } else if (override === 'expense') {
    kind = 'expense'
  } else if (effectiveAmount < 0) {
    kind = 'expense'
  } else if (effectiveAmount > 0) {
    kind = 'income'
  } else {
    kind = 'transfer'
  }

  const isTradingTransfer =
    kind === 'transfer' &&
    (isTradingPlatformLabel(name, row.merchant_name) ||
      isTradingPlatformLabel(String(row.merchant_name ?? ''), row.name))

  return {
    id: row.id,
    date: row.date,
    name,
    amount: effectiveAmount,
    sourceAmount,
    category,
    typeOverride: override,
    kind,
    isTradingTransfer,
  }
}

export function aggregateClassifiedTransactions(transactions: ClassifiedTransaction[]): {
  monthIncome: number
  monthExpenses: number
  monthNet: number
  tradingTransferTotal: number
  transferTotal: number
  topSpendingCategories: string[]
  recentTransactions: Array<{
    date: string
    name: string
    amount: number
    category?: string
    kind: string
  }>
} {
  let monthIncome = 0
  let monthExpenses = 0
  let tradingTransferTotal = 0
  let transferTotal = 0
  const categoryTotals = new Map<string, number>()

  for (const t of transactions) {
    const abs = Math.abs(t.amount)
    if (t.kind === 'income') {
      monthIncome += abs
    } else if (t.kind === 'expense') {
      monthExpenses += abs
      if (t.category) {
        categoryTotals.set(t.category, (categoryTotals.get(t.category) ?? 0) + abs)
      }
    } else if (t.kind === 'transfer') {
      transferTotal += abs
      if (t.isTradingTransfer) tradingTransferTotal += abs
    }
  }

  const topSpendingCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => `${cat} $${total.toFixed(0)}`)

  const recentTransactions = transactions.slice(0, 15).map((t) => ({
    date: t.date,
    name: t.name,
    amount: t.amount,
    category: t.category,
    kind: t.kind,
  }))

  return {
    monthIncome,
    monthExpenses,
    monthNet: monthIncome - monthExpenses - transferTotal,
    tradingTransferTotal,
    transferTotal,
    topSpendingCategories,
    recentTransactions,
  }
}
