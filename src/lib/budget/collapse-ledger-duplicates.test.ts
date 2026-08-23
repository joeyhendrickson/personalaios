import { describe, expect, it } from 'vitest'
import { collapseLedgerDuplicates } from './collapse-ledger-duplicates'

describe('collapseLedgerDuplicates', () => {
  it('keeps one row when the same Plaid transaction id appears twice', () => {
    const kept = collapseLedgerDuplicates([
      {
        id: 'old',
        transaction_id: 'txn_1',
        amount: -12.5,
        date: '2026-08-01',
        name: 'Coffee',
        pending: false,
        created_at: '2026-08-01T00:00:00Z',
        bank_account_id: 'acct-old',
        bank_accounts: { name: 'Checking', mask: '1234' },
      },
      {
        id: 'new',
        transaction_id: 'txn_1',
        amount: -12.5,
        date: '2026-08-01',
        name: 'Coffee',
        pending: false,
        created_at: '2026-08-20T00:00:00Z',
        bank_account_id: 'acct-new',
        bank_accounts: { name: 'Checking', mask: '1234' },
      },
    ])

    expect(kept).toHaveLength(1)
    expect(kept[0]?.id).toBe('new')
  })

  it('collapses reconnect copies that share date, amount, name, and account mask', () => {
    const kept = collapseLedgerDuplicates([
      {
        id: 'old',
        transaction_id: 'plaid-old',
        amount: -84.2,
        date: '2026-07-15',
        name: 'Kroger',
        bank_accounts: { name: 'TOTAL CHECKING', mask: '9876' },
      },
      {
        id: 'new',
        transaction_id: 'plaid-new',
        amount: -84.2,
        date: '2026-07-15',
        name: 'KROGER',
        created_at: '2026-08-01T00:00:00Z',
        bank_accounts: { name: 'TOTAL CHECKING', mask: '9876' },
      },
    ])

    expect(kept).toHaveLength(1)
    expect(kept[0]?.id).toBe('new')
  })

  it('drops a pending row once the posted copy exists', () => {
    const kept = collapseLedgerDuplicates([
      {
        id: 'pending',
        transaction_id: 'pending-1',
        amount: -40,
        date: '2026-08-10',
        name: 'Shell Oil Pending',
        pending: true,
        bank_accounts: { name: 'Credit Card', mask: '2222' },
      },
      {
        id: 'posted',
        transaction_id: 'posted-1',
        amount: -40,
        date: '2026-08-11',
        name: 'SHELL OIL',
        pending: false,
        bank_accounts: { name: 'Credit Card', mask: '2222' },
      },
    ])

    expect(kept.map((row) => row.id)).toEqual(['posted'])
  })

  it('does not hide a PayPal payout and a checking transfer of the same amount', () => {
    const kept = collapseLedgerDuplicates([
      {
        id: 'paypal',
        transaction_id: 'pp-1',
        amount: -1126.17,
        date: '2026-05-13',
        name: 'Payment from Airbnb',
        bank_accounts: { name: 'PayPal', mask: '0001' },
      },
      {
        id: 'checking',
        transaction_id: 'chk-1',
        amount: -1126.17,
        date: '2026-05-14',
        name: 'PAYPAL TRANSFER',
        bank_accounts: { name: 'TOTAL CHECKING', mask: '9876' },
      },
    ])

    expect(kept).toHaveLength(2)
  })

  it('keeps two same-day purchases with different names', () => {
    const kept = collapseLedgerDuplicates([
      {
        id: 'a',
        amount: -4.5,
        date: '2026-08-01',
        name: 'Coffee Shop A',
        bank_accounts: { name: 'Checking', mask: '1234' },
      },
      {
        id: 'b',
        amount: -4.5,
        date: '2026-08-01',
        name: 'Coffee Shop B',
        bank_accounts: { name: 'Checking', mask: '1234' },
      },
    ])

    expect(kept).toHaveLength(2)
  })
})
