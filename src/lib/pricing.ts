/** Monthly USD prices shown in product UI and default PayPal order amounts. */
export const MONTHLY_STANDARD_USD = 50
export const MONTHLY_PREMIUM_COACHING_USD = 500

/** Strings for PayPal APIs (two decimal places). */
export const monthlyStandardPayPalValue = MONTHLY_STANDARD_USD.toFixed(2)
export const monthlyPremiumCoachingPayPalValue = MONTHLY_PREMIUM_COACHING_USD.toFixed(2)

export const monthlyStandardDisplay = '$' + monthlyStandardPayPalValue
export const monthlyPremiumCoachingDisplay = '$' + monthlyPremiumCoachingPayPalValue

export function isPremiumChargeAmount(amount: number): boolean {
  const cents = Math.round(amount * 100)
  return cents === MONTHLY_PREMIUM_COACHING_USD * 100 || cents === 24999
}
