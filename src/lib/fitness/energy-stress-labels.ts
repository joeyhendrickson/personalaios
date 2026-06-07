/** Human-readable labels for energy/stress score factors shown in the UI. */
const ADJUSTMENT_LABELS: Record<string, string> = {
  'sleep_baseline:>=8h_rhr<80': 'Strong sleep (8+ hours) with resting HR under 80',
  'sleep_baseline:6-8h': 'Moderate sleep (6–8 hours)',
  'sleep_baseline:5-6h': 'Short sleep (5–6 hours)',
  'sleep_baseline:4-5h': 'Very short sleep (4–5 hours)',
  'sleep_baseline:<4h': 'Minimal sleep (under 4 hours)',
  'sleep_baseline:fallback_5/5': 'Neutral baseline (sleep pattern did not match a tier)',
  'sleep_baseline:no_sleep_data': 'Neutral baseline (no sleep data from Google Health yet)',
  'steps:>9000': 'High activity — over 9,000 steps',
  'steps:>7000': 'Solid activity — over 7,000 steps',
  'steps:>5000': 'Moderate activity — over 5,000 steps',
  'rhr:<70': 'Low resting heart rate (under 70 bpm)',
  'rhr:<80': 'Healthy resting heart rate (under 80 bpm)',
  'points:>=3x_weekly_avg': 'Exceptional LifeStacks points today (3× your weekly average)',
  'points:>=2x_weekly_avg': 'Strong LifeStacks points today (2× your weekly average)',
  'habits:>50%': 'More than half of your daily habits completed',
  'habits:<30%': 'Fewer than 30% of daily habits completed',
  'iam_present:1': 'I Am Present session today',
  'iam_present:>=2': 'Multiple I Am Present sessions today',
  'cash_drop:3-5%': 'Cash balance dipped 3–5% today',
  'cash_drop:5-8%': 'Cash balance dipped 5–8% today',
  'cash_drop:>=8%': 'Cash balance dipped 8%+ today',
  dream_catcher: 'Dream Catcher session (stress relief)',
  gratitude_journal: 'Gratitude journal entry',
  relationship_manager: 'Relationship Manager activity',
  self_care_rewards: 'Self-care reward redeemed',
  grocery_optimizer: 'Grocery Optimizer used',
  dating_goals: 'Dating goals added',
  market_predictions: 'Market prediction created',
  dashboard_goals: 'Dashboard goal added',
  dashboard_projects: 'Dashboard project added',
}

export function formatScoreFactors(adjustments: string[]): string[] {
  return adjustments.map((key) => ADJUSTMENT_LABELS[key] ?? key.replace(/_/g, ' '))
}
