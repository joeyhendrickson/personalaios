import { describe, expect, it } from 'vitest'
import { findDuplicateTransactions } from './find-duplicate-transactions'

describe('findDuplicateTransactions', () => {
  it('matches mirrored PayPal and checking payments with the same amount', () => {
    const result = findDuplicateTransactions([
      {
        id: 'a',
        transaction_id: 'paypal-airbnb-1',
        amount: -1126.17,
        date: '2026-05-13',
        name: 'Payment from Airbnb Payments Inc.',
        merchant_name: 'PayPal',
        bank_account_id: 'acct-paypal',
        bank_accounts: { id: 'acct-paypal', name: 'PayPal' },
      },
      {
        id: 'b',
        transaction_id: 'checking-transfer-1',
        amount: -1126.17,
        date: '2026-05-14',
        name: 'PAYPAL TRANSFER PPD ID: PAYPALSD11',
        merchant_name: null,
        bank_account_id: 'acct-checking',
        bank_accounts: { id: 'acct-checking', name: 'TOTAL CHECKING' },
      },
    ])

    expect(result.groupCount).toBe(1)
    expect(result.duplicateIds).toEqual(new Set(['a', 'b']))
  })

  it('still groups rows with the same bank transaction number', () => {
    const result = findDuplicateTransactions([
      {
        id: 'a',
        transaction_id: 'shared-number',
        amount: -25,
        date: '2026-05-01',
        bank_account_id: 'acct-1',
      },
      {
        id: 'b',
        transaction_id: 'shared-number',
        amount: -25,
        date: '2026-05-01',
        bank_account_id: 'acct-2',
      },
    ])

    expect(result.duplicateIds).toEqual(new Set(['a', 'b']))
  })

  it('does not flag unrelated purchases on different days under $100', () => {
    const result = findDuplicateTransactions([
      {
        id: 'a',
        amount: -42.5,
        date: '2026-05-01',
        name: 'Coffee Shop A',
        bank_account_id: 'acct-1',
      },
      {
        id: 'b',
        amount: -42.5,
        date: '2026-05-03',
        name: 'Coffee Shop B',
        bank_account_id: 'acct-2',
      },
    ])

    expect(result.duplicateIds.size).toBe(0)
  })
})
