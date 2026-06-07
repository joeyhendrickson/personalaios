import { clampInt } from '@/lib/fitness/contextual-energy'

export type EnergyStressInputs = {
  previousNightSleepHours?: number | null
  restingHeartRate?: number | null
  steps?: number | null
  dailyPoints?: number
  weeklyAveragePoints?: number
  habitCompletionRate?: number | null
  iamPresentEntriesToday?: number
  totalCashDropPercent?: number | null
  dreamCatcherLogsToday?: number
  gratitudeJournalLogsToday?: number
  relationshipManagerLogsToday?: number
  selfCareRewardsExchangeToday?: number
  groceryOptimizerLogsToday?: number
  datingGoalsAddedToday?: number
  marketPredictionsCreatedToday?: number
  dashboardGoalsAddedToday?: number
  dashboardProjectsAddedToday?: number
}

export type EnergyStressResult = {
  selfEnergyLevel: number
  stressLevel: number
  adjustmentsApplied: string[]
}

function applySleepBaseline(
  sleep: number | null | undefined,
  rhr: number | null | undefined
): { selfEnergyLevel: number; stressLevel: number; label: string } | null {
  if (typeof sleep !== 'number') return null

  if (sleep >= 8 && typeof rhr === 'number' && rhr < 80) {
    return { selfEnergyLevel: 8, stressLevel: 3, label: 'sleep_baseline:>=8h_rhr<80' }
  }
  if (sleep >= 6 && sleep < 8) {
    return { selfEnergyLevel: 7, stressLevel: 4, label: 'sleep_baseline:6-8h' }
  }
  if (sleep >= 5 && sleep < 6) {
    return { selfEnergyLevel: 5, stressLevel: 5, label: 'sleep_baseline:5-6h' }
  }
  if (sleep >= 4 && sleep < 5) {
    return { selfEnergyLevel: 4, stressLevel: 7, label: 'sleep_baseline:4-5h' }
  }
  if (sleep < 4) {
    return { selfEnergyLevel: 3, stressLevel: 8, label: 'sleep_baseline:<4h' }
  }
  return null
}

/**
 * Computes self-reported-style energy and stress scores from wearable + LifeStacks activity data.
 */
export function computeEnergyStressScores(input: EnergyStressInputs): EnergyStressResult {
  const adjustmentsApplied: string[] = []

  const baseline = applySleepBaseline(input.previousNightSleepHours, input.restingHeartRate)
  let selfEnergyLevel = baseline?.selfEnergyLevel ?? 5
  let stressLevel = baseline?.stressLevel ?? 5
  if (baseline) {
    adjustmentsApplied.push(baseline.label)
  } else if (typeof input.previousNightSleepHours === 'number') {
    adjustmentsApplied.push('sleep_baseline:fallback_5/5')
  } else {
    adjustmentsApplied.push('sleep_baseline:no_sleep_data')
  }

  const steps = input.steps
  if (typeof steps === 'number') {
    if (steps > 9000) {
      selfEnergyLevel += 3
      stressLevel -= 3
      adjustmentsApplied.push('steps:>9000')
    } else if (steps > 7000) {
      selfEnergyLevel += 2
      stressLevel -= 2
      adjustmentsApplied.push('steps:>7000')
    } else if (steps > 5000) {
      selfEnergyLevel += 1
      stressLevel -= 1
      adjustmentsApplied.push('steps:>5000')
    }
  }

  const rhr = input.restingHeartRate
  if (typeof rhr === 'number') {
    if (rhr < 70) {
      stressLevel -= 2
      adjustmentsApplied.push('rhr:<70')
    } else if (rhr < 80) {
      stressLevel -= 1
      adjustmentsApplied.push('rhr:<80')
    }
  }

  const dailyPoints = input.dailyPoints ?? 0
  const weeklyAveragePoints = input.weeklyAveragePoints ?? 0
  if (weeklyAveragePoints > 0) {
    if (dailyPoints >= weeklyAveragePoints * 3) {
      selfEnergyLevel += 2
      adjustmentsApplied.push('points:>=3x_weekly_avg')
    } else if (dailyPoints >= weeklyAveragePoints * 2) {
      selfEnergyLevel += 1
      adjustmentsApplied.push('points:>=2x_weekly_avg')
    }
  }

  const habitRate = input.habitCompletionRate
  if (typeof habitRate === 'number' && habitRate > 0) {
    if (habitRate > 0.5) {
      selfEnergyLevel += 1
      adjustmentsApplied.push('habits:>50%')
    }
    if (habitRate < 0.3) {
      selfEnergyLevel -= 1
      adjustmentsApplied.push('habits:<30%')
    }
  }

  const iam = input.iamPresentEntriesToday ?? 0
  if (iam >= 2) {
    stressLevel += 2
    adjustmentsApplied.push('iam_present:>=2')
  } else if (iam === 1) {
    stressLevel += 1
    adjustmentsApplied.push('iam_present:1')
  }

  const cashDrop = input.totalCashDropPercent
  if (typeof cashDrop === 'number') {
    if (cashDrop >= 8) {
      stressLevel += 3
      adjustmentsApplied.push('cash_drop:>=8%')
    } else if (cashDrop >= 5) {
      stressLevel += 2
      adjustmentsApplied.push('cash_drop:5-8%')
    } else if (cashDrop >= 3) {
      stressLevel += 1
      adjustmentsApplied.push('cash_drop:3-5%')
    }
  }

  if ((input.dreamCatcherLogsToday ?? 0) > 0) {
    stressLevel -= 1
    adjustmentsApplied.push('dream_catcher')
  }
  if ((input.gratitudeJournalLogsToday ?? 0) > 0) {
    selfEnergyLevel += 1
    adjustmentsApplied.push('gratitude_journal')
  }
  if ((input.relationshipManagerLogsToday ?? 0) > 0) {
    selfEnergyLevel += 1
    adjustmentsApplied.push('relationship_manager')
  }
  if ((input.selfCareRewardsExchangeToday ?? 0) > 0) {
    selfEnergyLevel += 1
    adjustmentsApplied.push('self_care_rewards')
  }
  if ((input.groceryOptimizerLogsToday ?? 0) > 0) {
    selfEnergyLevel += 1
    adjustmentsApplied.push('grocery_optimizer')
  }
  if ((input.datingGoalsAddedToday ?? 0) > 0) {
    selfEnergyLevel += 2
    adjustmentsApplied.push('dating_goals')
  }
  if ((input.marketPredictionsCreatedToday ?? 0) > 0) {
    stressLevel += 1
    adjustmentsApplied.push('market_predictions')
  }
  if ((input.dashboardGoalsAddedToday ?? 0) > 0) {
    selfEnergyLevel += 1
    adjustmentsApplied.push('dashboard_goals')
  }
  if ((input.dashboardProjectsAddedToday ?? 0) > 0) {
    stressLevel += 1
    adjustmentsApplied.push('dashboard_projects')
  }

  return {
    selfEnergyLevel: clampInt(selfEnergyLevel, 1, 10),
    stressLevel: clampInt(stressLevel, 1, 10),
    adjustmentsApplied,
  }
}
