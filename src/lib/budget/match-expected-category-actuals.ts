import { classifyPlaidTransactionDisplay } from './transaction-display-classification'
import { effectiveTransactionAmount } from './transaction-overrides'

export type BudgetTransactionForActuals = {
  id: string
  date: string
  amount: number
  name?: string | null
  merchant_name?: string | null
  category?: string[] | null
  type_override?: 'income' | 'expense' | 'transfer' | null
  amount_override?: number | null
  bank_accounts?: {
    name: string
    type: string
    official_name?: string | null
    subtype?: string | null
  } | null
}

export type TransactionRuleForActuals = {
  keyword: string
  transaction_type: 'income' | 'expense' | 'transfer'
  is_active?: boolean | null
}

export type ExpectedBudgetLine = {
  category: string
  amount: number
  frequency: string
}

export type CategoryActualLine = {
  category: string
  expected: number
  actual: number
  difference: number
  transactions: Array<{ date: string; name: string; amount: number }>
}

export type ExpectedCategoryActuals = {
  income: CategoryActualLine[]
  expenses: CategoryActualLine[]
  stats: {
    incomeTransactions: number
    expenseTransactions: number
    transferTransactions: number
    incomeAssigned: number
    incomeUnassigned: number
    expenseAssigned: number
    expenseUnassigned: number
  }
}

const STOP_WORDS = new Set(['and', 'the', 'for', 'from', 'with', 'other', 'misc', 'general'])

function norm(value: string | null | undefined): string {
  return (value || '').toLowerCase().trim()
}

function tokenize(value: string): string[] {
  return norm(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

function transactionSearchText(tx: BudgetTransactionForActuals): string {
  const plaid = Array.isArray(tx.category) ? tx.category.join(' ') : ''
  return norm(`${tx.name || ''} ${tx.merchant_name || ''} ${plaid}`)
}

function expandCategoryKeywords(categoryName: string): string[] {
  const category = norm(categoryName)
  const tokens = tokenize(categoryName)
  const keywords = new Set<string>(tokens)

  if (category.includes('utilit')) {
    ;['utility', 'electric', 'gas bill', 'water', 'sewer', 'internet', 'cable', 'phone'].forEach(
      (k) => keywords.add(k)
    )
  }
  if (category.includes('rent') || category.includes('housing')) {
    ;['rent', 'apartment', 'landlord', 'lease', 'housing'].forEach((k) => keywords.add(k))
  }
  if (category.includes('groc')) {
    ;[
      'grocery',
      'supermarket',
      'kroger',
      'safeway',
      'costco',
      'whole foods',
      'trader joe',
      'aldi',
    ].forEach((k) => keywords.add(k))
  }
  if (category.includes('gas') || category.includes('fuel')) {
    ;['gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'marathon', 'sunoco'].forEach((k) =>
      keywords.add(k)
    )
  }
  if (category.includes('insurance')) {
    ;['insurance', 'premium', 'policy'].forEach((k) => keywords.add(k))
  }
  if (category.includes('travel')) {
    ;['travel', 'airline', 'hotel', 'airbnb', 'expedia', 'delta', 'united', 'southwest'].forEach(
      (k) => keywords.add(k)
    )
  }
  if (category.includes('legal') || category.includes('professional')) {
    ;['legal', 'attorney', 'law firm', 'accountant', 'cpa', 'consulting'].forEach((k) =>
      keywords.add(k)
    )
  }
  if (category.includes('office')) {
    ;['office', 'supplies', 'staples', 'depot'].forEach((k) => keywords.add(k))
  }
  if (category.includes('repair') || category.includes('maintenance')) {
    ;['repair', 'maintenance', 'service', 'mechanic', 'auto'].forEach((k) => keywords.add(k))
  }
  if (category.includes('bank') || category.includes('fee')) {
    ;['bank fee', 'service charge', 'overdraft', 'maintenance fee'].forEach((k) => keywords.add(k))
  }
  if (category.includes('job') || category.includes('salary') || category.includes('payroll')) {
    ;[
      'payroll',
      'direct dep',
      'direct deposit',
      'salary',
      'paycheck',
      'employer',
      'adp',
      'gusto',
    ].forEach((k) => keywords.add(k))
  }
  if (category.includes('rental')) {
    ;['rental', 'tenant', 'airbnb host', 'property management'].forEach((k) => keywords.add(k))
  }
  if (category.includes('invest')) {
    ;[
      'dividend',
      'interest',
      'capital gain',
      'brokerage',
      'fidelity',
      'schwab',
      'vanguard',
    ].forEach((k) => keywords.add(k))
  }
  if (category.includes('freelance') || category.includes('contract')) {
    ;['freelance', 'contract', 'invoice', '1099', 'consulting', 'upwork', 'stripe'].forEach((k) =>
      keywords.add(k)
    )
  }

  return [...keywords]
}

export function categoryMatchScore(
  categoryName: string,
  transactionText: string,
  plaidCategories: string[]
): number {
  let score = 0
  const text = norm(transactionText)

  for (const keyword of expandCategoryKeywords(categoryName)) {
    if (keyword.length >= 3 && text.includes(keyword)) {
      score += keyword.length
    }
  }

  const categoryTokens = tokenize(categoryName)
  for (const token of categoryTokens) {
    if (text.includes(token)) score += token.length
  }

  const normalizedCategory = norm(categoryName)
  for (const plaidCategory of plaidCategories) {
    const plaid = norm(plaidCategory)
    if (!plaid) continue
    if (plaid.includes(normalizedCategory) || normalizedCategory.includes(plaid)) {
      score += 6
    }
    for (const token of categoryTokens) {
      if (plaid.includes(token)) score += 4
    }
  }

  return score
}

export function resolveBudgetTransactionKind(
  tx: BudgetTransactionForActuals,
  rules: TransactionRuleForActuals[]
): 'income' | 'expense' | 'transfer' {
  if (
    tx.type_override === 'income' ||
    tx.type_override === 'expense' ||
    tx.type_override === 'transfer'
  ) {
    return tx.type_override
  }

  const text = transactionSearchText(tx)
  const matchingRule = rules.find(
    (rule) => rule.is_active !== false && text.includes(norm(rule.keyword))
  )
  if (matchingRule) return matchingRule.transaction_type

  const classified = classifyPlaidTransactionDisplay({
    amount: tx.amount,
    name: tx.name || '',
    merchant_name: tx.merchant_name,
    category: tx.category,
    bankAccount: tx.bank_accounts,
  })

  if (classified.isIncome) return 'income'
  if (classified.isExpense) return 'expense'
  return 'transfer'
}

function signedAmountForKind(tx: BudgetTransactionForActuals, kind: 'income' | 'expense'): number {
  const effective = effectiveTransactionAmount(tx.amount, tx.amount_override ?? null)
  return kind === 'expense' ? Math.abs(effective) : Math.max(0, effective)
}

function calculateMonthlyAmount(item: ExpectedBudgetLine): number {
  if (item.frequency === 'weekly') return item.amount * 4.33
  if (item.frequency === 'biweekly') return item.amount * 2.17
  if (item.frequency === 'monthly') return item.amount
  if (item.frequency === 'quarterly') return item.amount / 3
  if (item.frequency === 'annually') return item.amount / 12
  return 0
}

function assignTransactionsToCategories(
  transactions: BudgetTransactionForActuals[],
  expectedLines: ExpectedBudgetLine[],
  kind: 'income' | 'expense',
  rules: TransactionRuleForActuals[]
): {
  lines: CategoryActualLine[]
  assignedCount: number
  unassignedCount: number
} {
  const assignments = new Map<string, string>()
  const categoryNames = expectedLines.map((line) => line.category)

  for (const tx of transactions) {
    const txKind = resolveBudgetTransactionKind(tx, rules)
    if (txKind !== kind) continue

    const text = transactionSearchText(tx)
    const plaidCategories = Array.isArray(tx.category) ? tx.category : []

    let bestCategory: string | null = null
    let bestScore = 0

    for (const line of expectedLines) {
      const score = categoryMatchScore(line.category, text, plaidCategories)
      if (score > bestScore) {
        bestScore = score
        bestCategory = line.category
      }
    }

    if (bestCategory && bestScore >= 4) {
      assignments.set(tx.id, bestCategory)
    }
  }

  const grouped = new Map<string, Array<{ date: string; name: string; amount: number }>>()
  for (const name of categoryNames) grouped.set(name, [])

  let assignedCount = 0
  let unassignedCount = 0

  for (const tx of transactions) {
    const txKind = resolveBudgetTransactionKind(tx, rules)
    if (txKind !== kind) continue

    const category = assignments.get(tx.id)
    if (!category) {
      unassignedCount += 1
      continue
    }

    assignedCount += 1
    grouped.get(category)?.push({
      date: tx.date,
      name: tx.name || tx.merchant_name || 'Unknown',
      amount: signedAmountForKind(tx, kind),
    })
  }

  const lines = expectedLines.map((line) => {
    const txns = grouped.get(line.category) || []
    const expected = calculateMonthlyAmount(line)
    const actual = txns.reduce((sum, txn) => sum + txn.amount, 0)
    return {
      category: line.category,
      expected,
      actual,
      difference: actual - expected,
      transactions: txns,
    }
  })

  return { lines, assignedCount, unassignedCount }
}

export function computeExpectedCategoryActuals(
  transactions: BudgetTransactionForActuals[],
  expectedIncome: ExpectedBudgetLine[],
  expectedExpenses: ExpectedBudgetLine[],
  rules: TransactionRuleForActuals[] = []
): ExpectedCategoryActuals {
  const incomeResult = assignTransactionsToCategories(transactions, expectedIncome, 'income', rules)
  const expenseResult = assignTransactionsToCategories(
    transactions,
    expectedExpenses,
    'expense',
    rules
  )

  let incomeTransactions = 0
  let expenseTransactions = 0
  let transferTransactions = 0

  for (const tx of transactions) {
    const kind = resolveBudgetTransactionKind(tx, rules)
    if (kind === 'income') incomeTransactions += 1
    else if (kind === 'expense') expenseTransactions += 1
    else transferTransactions += 1
  }

  return {
    income: incomeResult.lines,
    expenses: expenseResult.lines,
    stats: {
      incomeTransactions,
      expenseTransactions,
      transferTransactions,
      incomeAssigned: incomeResult.assignedCount,
      incomeUnassigned: incomeResult.unassignedCount,
      expenseAssigned: expenseResult.assignedCount,
      expenseUnassigned: expenseResult.unassignedCount,
    },
  }
}
