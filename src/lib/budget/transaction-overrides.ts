export type TransactionTypeOverride = 'income' | 'expense' | 'transfer'

export type TransactionOverrideFields = {
  type_override: TransactionTypeOverride | null
  amount_override: number | null
}

export function effectiveTransactionAmount(
  sourceAmount: number,
  amountOverride: number | null | undefined
): number {
  if (amountOverride != null && Number.isFinite(amountOverride)) {
    return amountOverride
  }
  return sourceAmount
}

export function mergeTransactionOverridePatch(
  existing: TransactionOverrideFields | null | undefined,
  patch: {
    type_override?: TransactionTypeOverride | null
    amount_override?: number | null
  }
): TransactionOverrideFields | null {
  const merged: TransactionOverrideFields = {
    type_override:
      patch.type_override !== undefined ? patch.type_override : (existing?.type_override ?? null),
    amount_override:
      patch.amount_override !== undefined
        ? patch.amount_override
        : (existing?.amount_override ?? null),
  }

  if (merged.type_override === null && merged.amount_override === null) {
    return null
  }

  return merged
}
