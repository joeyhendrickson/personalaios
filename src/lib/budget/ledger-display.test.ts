import { describe, expect, it } from 'vitest'
import {
  budgetMagnitudeForKind,
  ledgerDisplayAmount,
  normalizedAmountOverride,
} from './ledger-display'

describe('ledgerDisplayAmount', () => {
  it('shows Plaid income (negative) as a positive ledger amount', () => {
    expect(ledgerDisplayAmount(-2500)).toBe(2500)
  })

  it('shows Plaid expense (positive) as a positive ledger amount', () => {
    expect(ledgerDisplayAmount(82.15)).toBe(82.15)
  })

  it('prefers a positive amount override', () => {
    expect(ledgerDisplayAmount(-2500, 2500)).toBe(2500)
  })

  it('abs-normalizes a negative override for display', () => {
    expect(ledgerDisplayAmount(-2500, -2500)).toBe(2500)
  })
})

describe('normalizedAmountOverride', () => {
  it('stores magnitude regardless of Plaid sign', () => {
    expect(normalizedAmountOverride(-1126.17)).toBe(1126.17)
    expect(normalizedAmountOverride(42.5)).toBe(42.5)
  })
})

describe('budgetMagnitudeForKind', () => {
  it('returns positive magnitudes for income and expense kinds', () => {
    expect(budgetMagnitudeForKind(-500, null, 'income')).toBe(500)
    expect(budgetMagnitudeForKind(500, null, 'expense')).toBe(500)
  })
})
