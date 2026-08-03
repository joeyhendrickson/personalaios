import { ledgerDisplayAmount } from './ledger-display'
import {
  resolveBudgetTransactionKind,
  type BudgetTransactionForActuals,
  type TransactionRuleForActuals,
} from './match-expected-category-actuals'

export type LedgerPeriodSummary = {
  incomeTotal: number
  expenseTotal: number
  transferTotal: number
  netProfit: number
  incomeCount: number
  expenseCount: number
  transferCount: number
  transactionCount: number
}

export type LedgerTransactionKind = 'income' | 'expense' | 'transfer'

export function classifyTransactionForLedger(
  tx: BudgetTransactionForActuals,
  rules: TransactionRuleForActuals[]
): {
  isIncome: boolean
  isExpense: boolean
  isMoneyTransfer: boolean
  kind: LedgerTransactionKind
} {
  const kind = resolveBudgetTransactionKind(tx, rules)
  return {
    kind,
    isIncome: kind === 'income',
    isExpense: kind === 'expense',
    isMoneyTransfer: kind === 'transfer',
  }
}

function transactionMagnitude(tx: BudgetTransactionForActuals): number {
  const sourceAmount =
    tx.source_amount != null && Number.isFinite(Number(tx.source_amount))
      ? Number(tx.source_amount)
      : Number(tx.amount)
  return ledgerDisplayAmount(sourceAmount, tx.amount_override ?? null)
}

/** Sum income, expenses, transfers, and net for a loaded transaction period. */
export function summarizeLedgerTransactions(
  transactions: BudgetTransactionForActuals[],
  rules: TransactionRuleForActuals[]
): LedgerPeriodSummary {
  let incomeTotal = 0
  let expenseTotal = 0
  let transferTotal = 0
  let incomeCount = 0
  let expenseCount = 0
  let transferCount = 0

  for (const tx of transactions) {
    const kind = resolveBudgetTransactionKind(tx, rules)
    const magnitude = transactionMagnitude(tx)

    if (kind === 'income') {
      incomeTotal += magnitude
      incomeCount += 1
    } else if (kind === 'expense') {
      expenseTotal += magnitude
      expenseCount += 1
    } else {
      transferTotal += magnitude
      transferCount += 1
    }
  }

  return {
    incomeTotal,
    expenseTotal,
    transferTotal,
    netProfit: incomeTotal - expenseTotal,
    incomeCount,
    expenseCount,
    transferCount,
    transactionCount: transactions.length,
  }
}
