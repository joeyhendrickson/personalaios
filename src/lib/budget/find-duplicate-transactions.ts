export type DuplicateScanTransaction = {
  id: string
  transaction_id?: string | null
  amount: number
  date: string
  name?: string | null
  merchant_name?: string | null
  bank_account_id?: string | null
  bank_accounts?: { id?: string; name?: string | null } | null
}

export type DuplicateScanResult = {
  duplicateIds: Set<string>
  groupCount: number
}

const MIRROR_KEYWORDS = [
  'paypal',
  'venmo',
  'zelle',
  'cash app',
  'transfer',
  'ach',
  'wire',
  'payment from',
  'payout',
  'deposit from',
  'ppd id',
  'airbnb',
]

function amountCents(amount: number): number {
  return Math.round(amount * 100)
}

function accountKey(transaction: DuplicateScanTransaction): string {
  return (
    transaction.bank_account_id ??
    transaction.bank_accounts?.id ??
    transaction.bank_accounts?.name ??
    transaction.id
  )
}

function daysApart(leftDate: string, rightDate: string): number {
  const left = new Date(`${leftDate}T12:00:00`).getTime()
  const right = new Date(`${rightDate}T12:00:00`).getTime()
  return Math.abs(left - right) / (24 * 60 * 60 * 1000)
}

function searchText(transaction: DuplicateScanTransaction): string {
  return `${transaction.name ?? ''} ${transaction.merchant_name ?? ''} ${transaction.bank_accounts?.name ?? ''}`.toLowerCase()
}

function hasMirrorSignal(left: DuplicateScanTransaction, right: DuplicateScanTransaction): boolean {
  const combined = `${searchText(left)} ${searchText(right)}`
  return MIRROR_KEYWORDS.some((keyword) => combined.includes(keyword))
}

function isCrossAccountDuplicate(
  left: DuplicateScanTransaction,
  right: DuplicateScanTransaction
): boolean {
  if (left.id === right.id) return false
  if (accountKey(left) === accountKey(right)) return false
  if (amountCents(left.amount) !== amountCents(right.amount)) return false

  const dayGap = daysApart(left.date, right.date)
  if (dayGap > 3) return false

  const leftSign = Math.sign(left.amount)
  const rightSign = Math.sign(right.amount)
  if (leftSign !== 0 && rightSign !== 0 && leftSign !== rightSign) return false

  const absCents = Math.abs(amountCents(left.amount))
  if (absCents >= 10_000) return true
  if (dayGap <= 1) return true
  return hasMirrorSignal(left, right)
}

function createUnionFind(ids: string[]) {
  const parent = new Map<string, string>()
  for (const id of ids) parent.set(id, id)

  const find = (id: string): string => {
    let root = parent.get(id) ?? id
    while (parent.get(root) !== root) {
      root = parent.get(root)!
    }
    let current = id
    while (parent.get(current) !== root) {
      const next = parent.get(current)!
      parent.set(current, root)
      current = next
    }
    return root
  }

  const union = (leftId: string, rightId: string) => {
    const leftRoot = find(leftId)
    const rightRoot = find(rightId)
    if (leftRoot !== rightRoot) parent.set(leftRoot, rightRoot)
  }

  return { find, union }
}

/** Find duplicate transactions by shared bank IDs or mirrored cross-account payments. */
export function findDuplicateTransactions(
  transactions: DuplicateScanTransaction[]
): DuplicateScanResult {
  if (transactions.length < 2) {
    return { duplicateIds: new Set(), groupCount: 0 }
  }

  const ids = transactions.map((transaction) => transaction.id)
  const { find, union } = createUnionFind(ids)

  const byTransactionNumber = new Map<string, string[]>()
  for (const transaction of transactions) {
    const transactionNumber = transaction.transaction_id?.trim()
    if (!transactionNumber) continue
    const group = byTransactionNumber.get(transactionNumber) ?? []
    group.push(transaction.id)
    byTransactionNumber.set(transactionNumber, group)
  }

  for (const group of byTransactionNumber.values()) {
    for (let index = 1; index < group.length; index += 1) {
      union(group[0], group[index])
    }
  }

  const byAmount = new Map<number, DuplicateScanTransaction[]>()
  for (const transaction of transactions) {
    const key = amountCents(transaction.amount)
    const group = byAmount.get(key) ?? []
    group.push(transaction)
    byAmount.set(key, group)
  }

  for (const group of byAmount.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (isCrossAccountDuplicate(group[i], group[j])) {
          union(group[i].id, group[j].id)
        }
      }
    }
  }

  const components = new Map<string, string[]>()
  for (const transaction of transactions) {
    const root = find(transaction.id)
    const group = components.get(root) ?? []
    group.push(transaction.id)
    components.set(root, group)
  }

  const duplicateIds = new Set<string>()
  let groupCount = 0
  for (const group of components.values()) {
    if (group.length < 2) continue
    groupCount += 1
    for (const id of group) duplicateIds.add(id)
  }

  return { duplicateIds, groupCount }
}
