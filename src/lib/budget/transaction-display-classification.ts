/**
 * Client-side display classification for Budget Advisor transactions.
 * Combines Plaid account type (+ name keywords like "credit card") with amount sign
 * and transaction text heuristics (merchant vs P2P / bank transfer).
 */

export type BankAccountForClassification = {
  name: string
  type: string
  official_name?: string | null
  subtype?: string | null
}

export type ClassifyTransactionDisplayInput = {
  amount: number
  name: string
  merchant_name?: string | null
  category?: string[] | null
  bankAccount: BankAccountForClassification | null | undefined
}

export type TransactionDisplayClassification = {
  isIncome: boolean
  isExpense: boolean
  isMoneyTransfer: boolean
}

function norm(s: string): string {
  return s.toLowerCase()
}

/** Plaid + name-based credit detection (root workflow). */
export function isCreditAccount(account: BankAccountForClassification | null | undefined): boolean {
  if (!account) return false
  const type = norm(account.type || '')
  const subtype = norm(account.subtype || '')
  const label = norm(`${account.name || ''} ${account.official_name || ''}`)

  if (type === 'credit' || type.includes('credit')) return true
  if (subtype.includes('credit')) return true
  if (label.includes('credit card') || label.includes('creditcard')) return true
  if (label.includes('visa') && label.includes('card')) return true
  if (label.includes('mastercard') && label.includes('card')) return true
  if (label.includes('amex') || label.includes('american express')) return true
  return false
}

/** Non-credit depository-style accounts (default: treat like debit/checking for sign rules). */
export function isDebitLikeAccount(
  account: BankAccountForClassification | null | undefined
): boolean {
  if (!account) return true
  if (isCreditAccount(account)) return false
  const type = norm(account.type || '')
  const subtype = norm(account.subtype || '')
  const depositoryHints = [
    'depository',
    'checking',
    'savings',
    'paypal',
    'prepaid',
    'money market',
    'cd',
    'cash management',
  ]
  if (depositoryHints.some((h) => type.includes(h))) return true
  if (depositoryHints.some((h) => subtype.includes(h))) return true
  return true
}

function transactionText(name: string, merchant_name?: string | null): string {
  return norm(`${name || ''} ${merchant_name || ''}`)
}

const P2P_BANK_APP_KEYWORDS = [
  'venmo',
  'zelle',
  'apple cash',
  'cash app',
  'paypal',
  'mobile banking',
  'online banking transfer',
  'online transfer',
  'internal transfer',
  'external transfer',
  'bank transfer',
  'p2p',
  'popmoney',
  'google pay',
]

const TRANSFER_OUT_KEYWORDS = [
  'transfer to',
  'payment to',
  'send money',
  'wire ',
  'wire transfer',
  'ach ',
  'move money',
  'bill pay',
  'online payment',
  'e-transfer',
  'etransfer',
]

const ATM_WITHDRAW_KEYWORDS = [
  'atm',
  'withdrawal',
  'withdraw cash',
  'cash withdraw',
  'cash withdrawal',
]

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k))
}

function plaidCategoryBlob(category: string[] | null | undefined): string {
  if (!category || !Array.isArray(category)) return ''
  return norm(category.join(' '))
}

/** Plaid-style merchant / spend categories (validates debit card purchase vs transfer). */
function looksLikeMerchantSpend(input: ClassifyTransactionDisplayInput): boolean {
  const merchant = (input.merchant_name || '').trim()
  if (merchant.length > 0) return true

  const cat = plaidCategoryBlob(input.category)
  const spendHints = [
    'food and drink',
    'shops',
    'merchandise',
    'general merchandise',
    'recreation',
    'travel',
    'entertainment',
    'groceries',
    'gas stations',
    'transportation',
    'home improvement',
    'personal care',
    'medical',
    'government services',
    'service',
    'rent',
    'utilities',
  ]
  if (spendHints.some((h) => cat.includes(h))) return true

  return false
}

function isPaymentFromIncome(text: string): boolean {
  return text.includes('payment from')
}

/**
 * Default classification when user override and keyword rules did not apply.
 */
export function classifyPlaidTransactionDisplay(
  input: ClassifyTransactionDisplayInput
): TransactionDisplayClassification {
  const text = transactionText(input.name, input.merchant_name)
  const cats = plaidCategoryBlob(input.category)
  const combined = `${text} ${cats}`

  const credit = isCreditAccount(input.bankAccount)
  const debitLike = isDebitLikeAccount(input.bankAccount)

  // Transfers indicated by Plaid categories (before amount rules)
  const transferCategoryHints = [
    'bank transfer',
    'ach',
    'wire',
    'internal transfer',
    'external transfer',
    'account transfer',
  ]
  if (transferCategoryHints.some((h) => cats.includes(h)) && !isPaymentFromIncome(combined)) {
    return { isIncome: false, isExpense: false, isMoneyTransfer: true }
  }

  if (isPaymentFromIncome(text)) {
    return { isIncome: true, isExpense: false, isMoneyTransfer: false }
  }

  const p2pOrBankApp = hasAnyKeyword(combined, P2P_BANK_APP_KEYWORDS)
  const transferOut = hasAnyKeyword(combined, TRANSFER_OUT_KEYWORDS)
  const atm = hasAnyKeyword(combined, ATM_WITHDRAW_KEYWORDS)

  if (credit) {
    // Credit: positive = spend on card (expense); negative = payment/refund/credit (income)
    if (input.amount > 0) {
      const merchantish = looksLikeMerchantSpend(input)
      if (merchantish || !p2pOrBankApp) {
        return { isIncome: false, isExpense: true, isMoneyTransfer: false }
      }
      return { isIncome: false, isExpense: false, isMoneyTransfer: true }
    }
    if (input.amount < 0) {
      return { isIncome: true, isExpense: false, isMoneyTransfer: false }
    }
    return { isIncome: false, isExpense: false, isMoneyTransfer: true }
  }

  if (debitLike) {
    // Debit: positive = deposit / income; negative = often transfer/ATM, else merchant debit
    if (input.amount > 0) {
      if (p2pOrBankApp || isPaymentFromIncome(combined)) {
        return { isIncome: true, isExpense: false, isMoneyTransfer: false }
      }
      return { isIncome: true, isExpense: false, isMoneyTransfer: false }
    }
    if (input.amount < 0) {
      if (atm || transferOut || p2pOrBankApp) {
        return { isIncome: false, isExpense: false, isMoneyTransfer: true }
      }
      if (looksLikeMerchantSpend(input)) {
        return { isIncome: false, isExpense: true, isMoneyTransfer: false }
      }
      return { isIncome: false, isExpense: false, isMoneyTransfer: true }
    }
    return { isIncome: false, isExpense: false, isMoneyTransfer: true }
  }

  return { isIncome: false, isExpense: false, isMoneyTransfer: true }
}
