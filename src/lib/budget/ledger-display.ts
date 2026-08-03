/**
 * Budget Master ledger display rules.
 *
 * Plaid stores signed amounts (depository: negative = money in, positive = money out).
 * Users classify with arrows (income / expense / transfer) and expect positive dollar
 * amounts in the ledger — type is shown by color/icon, not by a leading minus sign.
 */
import { effectiveTransactionAmount } from './transaction-overrides'

export type LedgerTransactionKind = 'income' | 'expense' | 'transfer'

/** Dollar amount shown in the transaction ledger (always non-negative). */
export function ledgerDisplayAmount(sourceAmount: number, amountOverride?: number | null): number {
  const effective = effectiveTransactionAmount(sourceAmount, amountOverride ?? null)
  return Math.abs(effective)
}

/** Stored override magnitude when user classifies or edits a transaction. */
export function normalizedAmountOverride(sourceAmount: number): number {
  return Math.abs(Number(sourceAmount))
}

/** Budget totals use positive magnitudes; kind determines income vs expense bucket. */
export function budgetMagnitudeForKind(
  sourceAmount: number,
  amountOverride: number | null | undefined,
  _kind: LedgerTransactionKind
): number {
  return ledgerDisplayAmount(sourceAmount, amountOverride)
}
