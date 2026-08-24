export type SavingsInputs = {
  typicalDrinkCost: number
  typicalDrinksPerWeek: number
  soberDayCount: number
}

export type SavingsResult = {
  dailyCost: number
  weeklyCost: number
  monthlyCost: number
  yearlyCost: number
  savedToDate: number
  projectedYearIfSober: number
}

function n(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

export function computeDrinkSavings(input: SavingsInputs): SavingsResult {
  const cost = n(input.typicalDrinkCost)
  const drinksPerWeek = n(input.typicalDrinksPerWeek)
  const soberDays = Math.floor(n(input.soberDayCount))

  const weeklyCost = cost * drinksPerWeek
  const dailyCost = weeklyCost / 7
  const monthlyCost = weeklyCost * (365.25 / 12 / 7)
  const yearlyCost = weeklyCost * (365.25 / 7)
  const savedToDate = dailyCost * soberDays

  return {
    dailyCost: roundMoney(dailyCost),
    weeklyCost: roundMoney(weeklyCost),
    monthlyCost: roundMoney(monthlyCost),
    yearlyCost: roundMoney(yearlyCost),
    savedToDate: roundMoney(savedToDate),
    projectedYearIfSober: roundMoney(yearlyCost),
  }
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}
