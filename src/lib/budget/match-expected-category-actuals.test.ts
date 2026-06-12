import { describe, expect, it } from 'vitest'
import {
  categoryMatchScore,
  computeExpectedCategoryActuals,
} from './match-expected-category-actuals'

describe('computeExpectedCategoryActuals', () => {
  it('does not assign every income line the same total when merchant is blank', () => {
    const transactions = [
      {
        id: '1',
        date: '2026-05-01',
        amount: 5000,
        name: 'Direct Deposit Payroll',
        merchant_name: null,
        category: ['Payroll'],
        bank_accounts: { name: 'Checking', type: 'depository' },
      },
      {
        id: '2',
        date: '2026-05-10',
        amount: 650,
        name: 'Airbnb Payment',
        merchant_name: '',
        category: ['Rental Income'],
        bank_accounts: { name: 'Checking', type: 'depository' },
      },
    ]

    const actuals = computeExpectedCategoryActuals(
      transactions,
      [
        { category: 'Job', amount: 12000, frequency: 'monthly' },
        { category: 'Rental Income', amount: 6500, frequency: 'monthly' },
        { category: 'Investment Income', amount: 5000, frequency: 'monthly' },
      ],
      [],
      []
    )

    const job = actuals.income.find((line) => line.category === 'Job')
    const rental = actuals.income.find((line) => line.category === 'Rental Income')
    const investment = actuals.income.find((line) => line.category === 'Investment Income')

    expect(job?.actual).toBe(5000)
    expect(rental?.actual).toBe(650)
    expect(investment?.actual).toBe(0)
  })

  it('assigns each transaction to at most one expected category', () => {
    const actuals = computeExpectedCategoryActuals(
      [
        {
          id: '1',
          date: '2026-05-01',
          amount: -2200,
          name: 'Rent Payment',
          merchant_name: 'Property Mgmt',
          category: ['Rent'],
          bank_accounts: { name: 'Checking', type: 'depository' },
        },
      ],
      [],
      [
        { category: 'Rent', amount: 2200, frequency: 'monthly' },
        { category: 'Utilities', amount: 600, frequency: 'monthly' },
      ],
      []
    )

    expect(actuals.expenses.find((line) => line.category === 'Rent')?.actual).toBe(2200)
    expect(actuals.expenses.find((line) => line.category === 'Utilities')?.actual).toBe(0)
  })

  it('classifies credit card purchases as expenses even when amount is positive', () => {
    const actuals = computeExpectedCategoryActuals(
      [
        {
          id: '1',
          date: '2026-05-03',
          amount: 82.15,
          name: 'Shell Gas Station',
          merchant_name: 'Shell',
          category: ['Gas Stations'],
          bank_accounts: { name: 'Visa Credit Card', type: 'credit' },
        },
      ],
      [],
      [{ category: 'Gasoline', amount: 166.67, frequency: 'monthly' }],
      []
    )

    expect(actuals.stats.expenseTransactions).toBe(1)
    expect(actuals.expenses.find((line) => line.category === 'Gasoline')?.actual).toBe(82.15)
  })
})

describe('categoryMatchScore', () => {
  it('ignores empty-string token matches', () => {
    expect(categoryMatchScore('Job', 'direct deposit', [])).toBeGreaterThan(0)
    expect(categoryMatchScore('Investment Income', 'direct deposit', [])).toBe(0)
  })
})
