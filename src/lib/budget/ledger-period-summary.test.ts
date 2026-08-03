import { describe, expect, it } from 'vitest'
import { summarizeLedgerTransactions } from './ledger-period-summary'

describe('summarizeLedgerTransactions', () => {
  it('totals income and expenses using overrides and rules', () => {
    const summary = summarizeLedgerTransactions(
      [
        {
          id: '1',
          date: '2026-01-05',
          amount: 2500,
          source_amount: -2500,
          name: 'Payroll',
          type_override: 'income',
          amount_override: 2500,
        },
        {
          id: '2',
          date: '2026-01-06',
          amount: 82.15,
          source_amount: 82.15,
          name: 'Kroger',
          type_override: 'expense',
          amount_override: 82.15,
        },
        {
          id: '3',
          date: '2026-01-07',
          amount: 500,
          source_amount: -500,
          name: 'Transfer to savings',
          type_override: 'transfer',
          amount_override: 500,
        },
      ],
      []
    )

    expect(summary.incomeTotal).toBe(2500)
    expect(summary.expenseTotal).toBe(82.15)
    expect(summary.transferTotal).toBe(500)
    expect(summary.netProfit).toBeCloseTo(2417.85)
    expect(summary.incomeCount).toBe(1)
    expect(summary.expenseCount).toBe(1)
    expect(summary.transferCount).toBe(1)
  })
})
