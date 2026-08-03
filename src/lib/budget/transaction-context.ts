/**
 * Classify transactions for AI context using user overrides (Budget Manager).
 */
import type { VerifiedPeriodSummary } from '@/lib/budget/verified-period-cache'
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
  } else if (sourceAmount < 0) {
    // Plaid depository: negative = money in (income/credit)
    kind = 'income'
  } else if (sourceAmount > 0) {
    // Plaid depository: positive = money out (expense/debit)
    kind = 'expense'
  } else {
    kind = 'transfer'
  }

  const magnitude = Math.abs(effectiveAmount)

  const isTradingTransfer =
    kind === 'transfer' &&
    (isTradingPlatformLabel(name, row.merchant_name) ||
      isTradingPlatformLabel(String(row.merchant_name ?? ''), row.name))

  return {
    id: row.id,
    date: row.date,
    name,
    amount: magnitude,
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

const TRANSACTION_QUERY_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'how',
  'much',
  'did',
  'spend',
  'spent',
  'at',
  'from',
  'with',
  'my',
  'any',
  'all',
  'total',
  'what',
  'were',
  'was',
  'are',
  'have',
  'has',
  'this',
  'that',
  'last',
  'month',
  'week',
  'year',
  'about',
  'show',
  'tell',
  'give',
  'find',
  'list',
  'many',
  'budget',
  'money',
  'transaction',
  'transactions',
  'purchase',
  'purchases',
])

/** Pull merchant/store terms from advisor questions (e.g. "spend at Kroger"). */
export function extractTransactionSearchTerms(question: string | undefined): string[] {
  if (!question?.trim()) return []
  const terms = new Set<string>()
  const lower = question.toLowerCase()

  for (const match of lower.matchAll(/\b(?:at|from|with|on)\s+([a-z0-9][a-z0-9\s&'.-]{1,35})/g)) {
    const phrase = match[1]
      .trim()
      .replace(/\s+(transactions?|purchases?|spending|store|stores)$/i, '')
      .trim()
    if (phrase.length >= 3 && !TRANSACTION_QUERY_STOP_WORDS.has(phrase)) {
      terms.add(phrase)
    }
  }

  for (const match of question.matchAll(/"([^"]{2,40})"/g)) {
    const phrase = match[1].toLowerCase().trim()
    if (phrase.length >= 3) terms.add(phrase)
  }

  for (const match of question.matchAll(/\b[A-Z][A-Za-z0-9&'.-]{2,}\b/g)) {
    terms.add(match[0].toLowerCase())
  }

  return [...terms].filter((term) => !TRANSACTION_QUERY_STOP_WORDS.has(term) && term.length >= 3)
}

export function looksLikeTransactionQuestion(message: string | undefined): boolean {
  if (!message?.trim()) return false
  const lower = message.toLowerCase()
  if (
    /\b(transaction|transactions|purchase|purchases|merchant|receipt|spending at|spent at|bought at|paid at)\b/.test(
      lower
    )
  ) {
    return true
  }
  return extractTransactionSearchTerms(message).length > 0
}

export function matchTransactionsByTerms(
  transactions: ClassifiedTransaction[],
  terms: string[]
): ClassifiedTransaction[] {
  if (!terms.length) return []
  return transactions.filter((t) => {
    const label = `${t.name} ${t.category ?? ''}`.toLowerCase()
    return terms.some((term) => label.includes(term))
  })
}

export function buildMerchantRollups(
  transactions: ClassifiedTransaction[],
  limit = 15
): Array<{ label: string; total_abs: number; count: number }> {
  const nameMap = new Map<string, { total: number; count: number }>()
  for (const t of transactions) {
    if (t.kind !== 'expense' && t.kind !== 'income') continue
    const label = t.name.slice(0, 80)
    const cur = nameMap.get(label) || { total: 0, count: 0 }
    cur.total += Math.abs(t.amount)
    cur.count += 1
    nameMap.set(label, cur)
  }
  return [...nameMap.entries()]
    .map(([label, v]) => ({ label, total_abs: v.total, count: v.count }))
    .sort((a, b) => b.total_abs - a.total_abs)
    .slice(0, limit)
}

export type BudgetAdvisorTransactionContext = {
  verifiedPeriods: VerifiedPeriodSummary[]
  merchantRollups: Array<{ label: string; total_abs: number; count: number }>
  queryMatchedTransactions: Array<{
    date: string
    name: string
    amount: number
    category?: string
    kind: string
  }>
  queryMatchedTotal: number
}
