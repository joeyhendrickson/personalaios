export type EventMonitoringKey =
  | 'earnings'
  | 'federalEvents'
  | 'tariffs'
  | 'rateCuts'
  | 'employment'
  | 'interestRates'
  | 'recession'
  | 'monetaryPolicy'
  | 'industryTrends'
  | 'analystRatings'

export type EventMonitoringConfig = Record<EventMonitoringKey, boolean>

export const EVENT_MONITORING_LABELS: Record<EventMonitoringKey, string> = {
  earnings: 'Earnings',
  federalEvents: 'Federal / Geopolitical Events',
  tariffs: 'Tariffs & Trade Policy',
  rateCuts: 'Rate Cuts / Fed Policy Shifts',
  employment: 'Employment / Jobs Data',
  interestRates: 'Interest Rates & Yields',
  recession: 'Recession / Macro Slowdown',
  monetaryPolicy: 'Monetary Policy (QE / QT)',
  industryTrends: 'Industry & Sector Trends',
  analystRatings: 'Analyst Ratings & Upgrades',
}

/** Headline archetypes the model should expand on per category. */
export const EVENT_MONITORING_HEADLINE_GUIDANCE: Record<EventMonitoringKey, string> = {
  earnings:
    'Beat/miss headlines, guidance raised/lowered, pre-announcements, whisper numbers, revenue surprise',
  federalEvents:
    'Geopolitical escalation or ceasefire headlines, sanctions, military conflict updates (e.g. "War in Iran continues"), government shutdown, major policy shocks',
  tariffs:
    'New tariffs announced, trade deal signed, retaliatory measures, supply-chain disruption headlines',
  rateCuts: 'Fed cut/hike/pause signals, dot plot shifts, Powell commentary, emergency Fed action',
  employment:
    'NFP beat/miss, unemployment rate jumps, jobless claims spike, wage growth hotter/cooler than expected',
  interestRates:
    '10Y yield breakout, inversion/de-inversion, credit spread widening, bond auction demand',
  recession:
    'GDP contraction, consumer confidence collapse, PMIs in contraction, credit tightening headlines',
  monetaryPolicy:
    'QE/QT pace changes, balance sheet updates, liquidity injection headlines, bank stress',
  industryTrends:
    'Sector rotation, regulatory approval/block, major product launch, competitor disruption',
  analystRatings:
    'Upgrade/downgrade, price target raise/cut, initiation coverage, bearish note from bulge bracket',
}

export function getEnabledEventMonitoringKeys(
  config: Partial<EventMonitoringConfig> | null | undefined
): EventMonitoringKey[] {
  if (!config) return []
  return (Object.entries(config) as [EventMonitoringKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
}

export function formatEventMonitoringForPrompt(
  config: Partial<EventMonitoringConfig> | null | undefined
): string {
  const enabled = getEnabledEventMonitoringKeys(config)
  if (enabled.length === 0) {
    return 'No event categories selected — skip news-triggered entry playbook unless macro news is unavoidable for this symbol.'
  }

  return enabled
    .map((key) => {
      return `- ${EVENT_MONITORING_LABELS[key]} (${key})
  Watch for headlines like: ${EVENT_MONITORING_HEADLINE_GUIDANCE[key]}
  Task: Map these headlines to historical sector/stock correlations and a specific entry (shares long/short, calls, puts, or wait).`
    })
    .join('\n')
}

export function formatPredictionThesis(
  prediction: { direction?: string; confidence?: number; riskLevel?: string } | null | undefined
): string {
  if (!prediction?.direction) return 'Direction not specified — infer cautiously from patterns.'
  return `Predicted intraday/swing direction: ${prediction.direction.toUpperCase()} (confidence ${prediction.confidence ?? 'n/a'}%, risk ${prediction.riskLevel ?? 'n/a'})`
}

export type NewsTriggeredEntry = {
  eventCategory: string
  headlineExamples: string[]
  entryTrigger: string
  recommendedPosition: string
  thesisAlignment: 'supports' | 'contradicts' | 'neutral'
  historicalCorrelation: string
  entryAction: string
  ifHeadlineContradictsThesis: string
}

export function buildFallbackNewsTriggeredEntries(
  config: Partial<EventMonitoringConfig> | null | undefined,
  predictionDirection?: string,
  stockSymbol = 'this symbol'
): NewsTriggeredEntry[] {
  const defaultPosition =
    predictionDirection === 'down'
      ? 'options_puts'
      : predictionDirection === 'up'
        ? 'options_calls'
        : 'shares'

  return getEnabledEventMonitoringKeys(config).map((key) => ({
    eventCategory: EVENT_MONITORING_LABELS[key],
    headlineExamples: EVENT_MONITORING_HEADLINE_GUIDANCE[key]
      .split(',')
      .slice(0, 2)
      .map((s) => s.trim()),
    entryTrigger:
      'When a matching headline appears and price moves in line with your thesis within 30–60 minutes',
    recommendedPosition: defaultPosition,
    thesisAlignment: 'neutral' as const,
    historicalCorrelation: `Review how ${stockSymbol} typically reacts to ${EVENT_MONITORING_LABELS[key].toLowerCase()} headlines before sizing.`,
    entryAction: `Enter ${defaultPosition.replace(/_/g, ' ')} per risk rules after headline and price confirmation.`,
    ifHeadlineContradictsThesis:
      'Do not add exposure; wait for confirmation or hedge existing positions.',
  }))
}
