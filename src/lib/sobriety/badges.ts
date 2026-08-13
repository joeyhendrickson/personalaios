export type SobrietyBadgeDef = {
  id: string
  name: string
  description: string
  icon: string
  category: 'streak' | 'honesty' | 'reflection' | 'savings' | 'insight'
}

export const SOBRIETY_BADGES: SobrietyBadgeDef[] = [
  {
    id: 'first_sober_day',
    name: 'Day One',
    description: 'Logged a day without drinking.',
    icon: 'sunrise',
    category: 'streak',
  },
  {
    id: 'streak_3',
    name: 'Three Days Clear',
    description: 'Three consecutive sober days.',
    icon: 'flame',
    category: 'streak',
  },
  {
    id: 'streak_7',
    name: 'One Week',
    description: 'Seven consecutive sober days.',
    icon: 'calendar',
    category: 'streak',
  },
  {
    id: 'streak_14',
    name: 'Two Weeks',
    description: 'Fourteen consecutive sober days.',
    icon: 'shield',
    category: 'streak',
  },
  {
    id: 'streak_30',
    name: 'One Month',
    description: 'Thirty consecutive sober days.',
    icon: 'award',
    category: 'streak',
  },
  {
    id: 'streak_60',
    name: 'Two Months',
    description: 'Sixty consecutive sober days.',
    icon: 'medal',
    category: 'streak',
  },
  {
    id: 'streak_90',
    name: 'Ninety Days',
    description: 'Ninety consecutive sober days.',
    icon: 'trophy',
    category: 'streak',
  },
  {
    id: 'streak_180',
    name: 'Half Year',
    description: 'One hundred eighty consecutive sober days.',
    icon: 'star',
    category: 'streak',
  },
  {
    id: 'streak_365',
    name: 'One Year',
    description: 'Three hundred sixty-five consecutive sober days.',
    icon: 'crown',
    category: 'streak',
  },
  {
    id: 'honesty',
    name: 'Honest Log',
    description: 'Logged a drinking day instead of hiding it.',
    icon: 'heart',
    category: 'honesty',
  },
  {
    id: 'reflection',
    name: 'Decision Journal',
    description: 'Wrote three decision notes around drinking days.',
    icon: 'book',
    category: 'reflection',
  },
  {
    id: 'pattern_seeker',
    name: 'Pattern Seeker',
    description: 'Confirmed a bar or restaurant that may influence drinking.',
    icon: 'map',
    category: 'insight',
  },
  {
    id: 'savings_100',
    name: 'First $100 Saved',
    description: 'Estimated $100 kept by not drinking.',
    icon: 'coins',
    category: 'savings',
  },
  {
    id: 'savings_500',
    name: '$500 Kept',
    description: 'Estimated $500 kept by not drinking.',
    icon: 'wallet',
    category: 'savings',
  },
  {
    id: 'savings_1000',
    name: '$1,000 Kept',
    description: 'Estimated $1,000 kept by not drinking.',
    icon: 'banknote',
    category: 'savings',
  },
]

const STREAK_BADGES: Array<{ id: string; days: number }> = [
  { id: 'first_sober_day', days: 1 },
  { id: 'streak_3', days: 3 },
  { id: 'streak_7', days: 7 },
  { id: 'streak_14', days: 14 },
  { id: 'streak_30', days: 30 },
  { id: 'streak_60', days: 60 },
  { id: 'streak_90', days: 90 },
  { id: 'streak_180', days: 180 },
  { id: 'streak_365', days: 365 },
]

export type BadgeEvalInput = {
  currentStreak: number
  totalSoberDays: number
  hasDrinkLog: boolean
  decisionLogCount: number
  confirmedPlaceCount: number
  savedToDate: number
}

export function evaluateEarnedBadgeIds(input: BadgeEvalInput): string[] {
  const earned: string[] = []

  for (const badge of STREAK_BADGES) {
    if (badge.id === 'first_sober_day') {
      if (input.totalSoberDays >= 1) earned.push(badge.id)
    } else if (input.currentStreak >= badge.days) {
      earned.push(badge.id)
    }
  }

  if (input.hasDrinkLog) earned.push('honesty')
  if (input.decisionLogCount >= 3) earned.push('reflection')
  if (input.confirmedPlaceCount >= 1) earned.push('pattern_seeker')
  if (input.savedToDate >= 100) earned.push('savings_100')
  if (input.savedToDate >= 500) earned.push('savings_500')
  if (input.savedToDate >= 1000) earned.push('savings_1000')

  return [...new Set(earned)]
}

export function badgeById(id: string): SobrietyBadgeDef | undefined {
  return SOBRIETY_BADGES.find((b) => b.id === id)
}
