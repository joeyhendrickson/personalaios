/**
 * Reconstruct approximate historical net worth from current balances + transaction history.
 * Matches Budget Advisor Summary semantics: bank assets vs liabilities + manual accounts.
 *
 * Plaid: positive amount on depository = outflow (reduces balance).
 * Asset accounts: balance_at_end(D) = current + sum(amount where date > D)
 * Liability (credit/loan): debt_at_end(D) = current - sum(amount where date > D)
 */

export type BankAccountRow = {
  id: string
  type: string | null
  subtype: string | null
  current_balance: number | null
}

export type TxRow = {
  bank_account_id: string
  date: string
  amount: number
}

export type ManualAccountRow = {
  account_type: string
  amount: number
}

function norm(s: string | null | undefined): string {
  return (s || '').toLowerCase()
}

/** Liability-style accounts: balance represents debt owed (Plaid convention). */
export function isLiabilityAccount(acc: BankAccountRow): boolean {
  const t = norm(acc.type)
  const st = norm(acc.subtype)
  const label = `${norm(acc.type)} ${norm(acc.subtype)}`
  if (t === 'credit' || t.includes('loan')) return true
  if (st.includes('credit')) return true
  if (st.includes('loan')) return true
  if (label.includes('credit card')) return true
  return false
}

/** Manual adjustment (constant over time — no historical breakdown). */
export function manualNetWorthContribution(manualAccounts: ManualAccountRow[]): number {
  let cash = 0
  let owed = 0
  for (const acc of manualAccounts) {
    if ((acc.account_type === 'investment' || acc.account_type === 'asset') && acc.amount > 0) {
      cash += acc.amount
    }
    if (acc.account_type === 'loan' || acc.amount < 0) {
      owed += Math.abs(acc.amount)
    }
  }
  return cash - owed
}

/** Contribution of one bank account to net worth at end of day D (signed). */
export function accountNetWorthContribution(
  acc: BankAccountRow,
  balanceAtEndOfDay: number
): number {
  if (isLiabilityAccount(acc)) {
    return -balanceAtEndOfDay
  }
  return balanceAtEndOfDay
}

function formatISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(iso: string, delta: number): string {
  const [y, m, day] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day))
  d.setUTCDate(d.getUTCDate() + delta)
  return formatISODate(d)
}

function iterDatesInclusive(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start <= end ? start : end
  const last = start <= end ? end : start
  while (cur <= last) {
    out.push(cur)
    const next = addDays(cur, 1)
    if (next <= cur) break
    cur = next
  }
  return out
}

/** Downsample so charts stay responsive (max ~450 points). */
export function downsampleDates(dates: string[], maxPoints: number): string[] {
  if (dates.length <= maxPoints) return dates
  const step = Math.ceil(dates.length / maxPoints)
  const out: string[] = []
  for (let i = 0; i < dates.length; i += step) {
    out.push(dates[i]!)
  }
  const last = dates[dates.length - 1]!
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export type NetWorthPoint = { date: string; netWorth: number }

export function buildNetWorthSeries(params: {
  accounts: BankAccountRow[]
  transactions: TxRow[]
  firstConnectionDate: string
  today: string
  manualAccounts: ManualAccountRow[]
  maxPoints?: number
}): NetWorthPoint[] {
  const { accounts, transactions, firstConnectionDate, today, manualAccounts } = params
  const maxPoints = params.maxPoints ?? 450

  const manualPart = manualNetWorthContribution(manualAccounts)

  const start = firstConnectionDate <= today ? firstConnectionDate : today

  if (accounts.length === 0) {
    const single = manualPart
    if (start > today) return []
    return [
      { date: start, netWorth: single },
      { date: today, netWorth: single },
    ]
  }

  const txsByAccount = new Map<string, Array<{ date: string; amount: number }>>()
  for (const acc of accounts) {
    txsByAccount.set(acc.id, [])
  }
  for (const tx of transactions) {
    if (!txsByAccount.has(tx.bank_account_id)) continue
    txsByAccount.get(tx.bank_account_id)!.push({ date: tx.date, amount: tx.amount })
  }
  for (const arr of txsByAccount.values()) {
    arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }

  const allDays = iterDatesInclusive(start, today)
  const sampleDays = downsampleDates(allDays, maxPoints)
  const sortedSampleDesc = [...sampleDays].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

  const ptr: Record<string, number> = {}
  const suffix: Record<string, number> = {}
  for (const acc of accounts) {
    ptr[acc.id] = 0
    suffix[acc.id] = 0
  }

  const pointsByDate = new Map<string, number>()

  for (const day of sortedSampleDesc) {
    for (const acc of accounts) {
      const list = txsByAccount.get(acc.id) || []
      let p = ptr[acc.id]!
      let s = suffix[acc.id]!
      while (p < list.length && list[p]!.date > day) {
        s += list[p]!.amount
        p++
      }
      ptr[acc.id] = p
      suffix[acc.id] = s
    }

    let nw = manualPart
    for (const acc of accounts) {
      const current = Number(acc.current_balance) || 0
      const suf = suffix[acc.id] || 0
      const balEnd = isLiabilityAccount(acc) ? current - suf : current + suf
      nw += accountNetWorthContribution(acc, balEnd)
    }

    pointsByDate.set(day, Math.round(nw * 100) / 100)
  }

  return sampleDays.map((d) => ({
    date: d,
    netWorth: pointsByDate.get(d) ?? 0,
  }))
}
