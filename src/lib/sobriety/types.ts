export type SobrietyDailyLog = {
  id: string
  user_id: string
  log_date: string
  drank: boolean
  drink_count: number
  estimated_spend: number | null
  notes: string | null
  points_awarded: number
  source: 'manual' | 'budget_place'
  created_at: string
  updated_at: string
}

export type SobrietyDecisionLog = {
  id: string
  user_id: string
  drink_log_id: string | null
  drink_date: string
  day_offset: 0 | 1 | 2
  content: string
  has_rumination: boolean
  created_at: string
  updated_at: string
}

export type SobrietyProfile = {
  user_id: string
  typical_drink_cost: number
  typical_drinks_per_week: number
  typical_drink_label: string
  typical_drinks_per_outing: number
  sobriety_start_date: string | null
  created_at: string
  updated_at: string
}

export type SobrietyInfluencePlace = {
  id: string
  user_id: string
  merchant_name: string
  category: 'bar' | 'restaurant' | 'other'
  visit_count: number
  last_seen_date: string | null
  total_spend: number
  highlighted: boolean
  user_confirmed: boolean
  counts_as_sober_outing: boolean
  created_at: string
  updated_at: string
}

export type SobrietyPlaceVisit = {
  id: string
  user_id: string
  place_id: string
  transaction_id: string | null
  visit_date: string
  amount: number | null
  merchant_name: string
  added_to_log: boolean
  created_at: string
}

export type SobrietyUserBadge = {
  badge_id: string
  earned_at: string
}

export type FitnessDaySnapshot = {
  date: string
  stress_level: number | null
  contextual_energy: number | null
  self_energy: number | null
  sleep_hours: number | null
  source: 'energy_history' | 'biometrics' | 'none'
}

export type AfterDrinkBiometrics = {
  drinkDate: string
  drinkCount: number
  day1: FitnessDaySnapshot
  day2: FitnessDaySnapshot
  energyDeltaVsBaseline: number | null
  stressDeltaVsBaseline: number | null
}

export type BarCandidate = {
  merchant_name: string
  category: 'bar' | 'restaurant' | 'other'
  visit_count: number
  total_spend: number
  last_seen_date: string | null
  sample_dates: string[]
  transaction_ids: string[]
  confidence: 'high' | 'medium' | 'low'
  reason: string
  source: 'live' | 'cached' | 'both'
}

export const SOBRIETY_POINTS_PER_SOBER_DAY = 25
export const IAM_PRESENT_HREF = '/modules/narrative-integration'
export const FITNESS_STATS_HREF = '/modules/fitness-tracker?tab=stats'
export const BUDGET_TRANSACTIONS_HREF = '/modules/budget-optimizer'
