export type LedgerDuplicateRow = {
  id: string
  transaction_id?: string | null
  amount: number
  date: string
  name?: string | null
  merchant_name?: string | null
  pending?: boolean | null
  created_at?: string | null
  bank_account_id?: string | null
  bank_accounts?: {
    id?: string | null
    name?: string | null
    official_name?: string | null
    mask?: string | null
  } | null
}

function amountCents(amount: number): number {
  return Math.round(Number(amount) * 100)
}

export function normalizeLedgerName(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\bpending\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function accountFingerprint(row: LedgerDuplicateRow): string {
  const mask = row.bank_accounts?.mask?.trim()
  const name = (row.bank_accounts?.official_name || row.bank_accounts?.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  if (mask) return `mask:${mask}`
  if (name) return `name:${name}`
  return `acct:${row.bank_account_id || row.bank_accounts?.id || row.id}`
}

function daysApart(leftDate: string, rightDate: string): number {
  const left = new Date(`${leftDate}T12:00:00`).getTime()
  const right = new Date(`${rightDate}T12:00:00`).getTime()
  return Math.abs(left - right) / (24 * 60 * 60 * 1000)
}

function preferRow<T extends LedgerDuplicateRow>(left: T, right: T): T {
  if (!!left.pending !== !!right.pending) return left.pending ? right : left
  const leftCreated = left.created_at ?? ''
  const rightCreated = right.created_at ?? ''
  if (leftCreated !== rightCreated) {
    return leftCreated > rightCreated ? left : right
  }
  return left.id > right.id ? left : right
}

function collapseGroups<T extends LedgerDuplicateRow>(
  rows: T[],
  keyFor: (row: T) => string | null
): T[] {
  const groups = new Map<string, T[]>()
  const ungrouped: T[] = []

  for (const row of rows) {
    const key = keyFor(row)
    if (!key) {
      ungrouped.push(row)
      continue
    }
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }

  const kept: T[] = [...ungrouped]
  for (const group of groups.values()) {
    kept.push(group.reduce((best, row) => preferRow(best, row)))
  }
  return kept
}

/** Hide extra copies of the same bank event so reconnects and pending/posted pairs do not double the list. */
export function collapseLedgerDuplicates<T extends LedgerDuplicateRow>(rows: T[]): T[] {
  if (rows.length < 2) return rows

  const byPlaidId = collapseGroups(rows, (row) => {
    const transactionNumber = row.transaction_id?.trim()
    return transactionNumber ? `plaid:${transactionNumber}` : null
  })

  const byFingerprint = collapseGroups(byPlaidId, (row) => {
    const name = normalizeLedgerName(row.name || row.merchant_name)
    if (!name) return null
    return `${row.date}|${amountCents(row.amount)}|${name}|${accountFingerprint(row)}`
  })

  const posted = byFingerprint.filter((row) => !row.pending)
  const pending = byFingerprint.filter((row) => row.pending)
  if (pending.length === 0) return byFingerprint

  const keptPending = pending.filter((pendingRow) => {
    return !posted.some((postedRow) => {
      if (accountFingerprint(pendingRow) !== accountFingerprint(postedRow)) return false
      if (amountCents(pendingRow.amount) !== amountCents(postedRow.amount)) return false
      if (daysApart(pendingRow.date, postedRow.date) > 5) return false
      const pendingName = normalizeLedgerName(pendingRow.name || pendingRow.merchant_name)
      const postedName = normalizeLedgerName(postedRow.name || postedRow.merchant_name)
      return pendingName !== '' && pendingName === postedName
    })
  })

  return [...posted, ...keptPending]
}
