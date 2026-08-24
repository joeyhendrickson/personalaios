export type SavingsInputs = {
  typicalDrinkCost: number
  typicalDrinksPerWeek: number
  soberDayCount: number
  typicalDrinksPerOuting?: number
  restaurantPlaces?: Array<{ visit_count: number; counts_as_sober_outing: boolean }>
}

export type RestaurantVisitSavings = {
  selectedPlaceCount: number
  visitCount: number
  drinksPerOuting: number
  drinksAvoided: number
  saved: number
}

export type SavingsResult = {
  dailyCost: number
  weeklyCost: number
  monthlyCost: number
  yearlyCost: number
  fromSoberDays: number
  fromRestaurantVisits: number
  savedToDate: number
  projectedYearIfSober: number
  restaurant: RestaurantVisitSavings
}

function n(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

export function computeRestaurantVisitSavings(input: {
  typicalDrinkCost: number
  typicalDrinksPerOuting: number
  places: Array<{ visit_count: number; counts_as_sober_outing: boolean }>
}): RestaurantVisitSavings {
  const included = input.places.filter((place) => place.counts_as_sober_outing)
  const visitCount = included.reduce(
    (sum, place) => sum + Math.max(0, Math.floor(n(place.visit_count))),
    0
  )
  const drinksPerOuting = n(input.typicalDrinksPerOuting)
  const drinksAvoided = visitCount * drinksPerOuting
  return {
    selectedPlaceCount: included.length,
    visitCount,
    drinksPerOuting: roundMoney(drinksPerOuting),
    drinksAvoided: roundMoney(drinksAvoided),
    saved: roundMoney(drinksAvoided * n(input.typicalDrinkCost)),
  }
}

export function computeDrinkSavings(input: SavingsInputs): SavingsResult {
  const cost = n(input.typicalDrinkCost)
  const drinksPerWeek = n(input.typicalDrinksPerWeek)
  const soberDays = Math.floor(n(input.soberDayCount))

  const weeklyCost = cost * drinksPerWeek
  const dailyCost = weeklyCost / 7
  const monthlyCost = weeklyCost * (365.25 / 12 / 7)
  const yearlyCost = weeklyCost * (365.25 / 7)
  const fromSoberDays = dailyCost * soberDays
  const restaurant = computeRestaurantVisitSavings({
    typicalDrinkCost: cost,
    typicalDrinksPerOuting: input.typicalDrinksPerOuting ?? 2,
    places: input.restaurantPlaces ?? [],
  })

  return {
    dailyCost: roundMoney(dailyCost),
    weeklyCost: roundMoney(weeklyCost),
    monthlyCost: roundMoney(monthlyCost),
    yearlyCost: roundMoney(yearlyCost),
    fromSoberDays: roundMoney(fromSoberDays),
    fromRestaurantVisits: restaurant.saved,
    savedToDate: roundMoney(fromSoberDays + restaurant.saved),
    projectedYearIfSober: roundMoney(yearlyCost),
    restaurant,
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
