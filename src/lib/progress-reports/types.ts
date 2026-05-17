export type ReportPeriodType = 'weekly' | 'bi_monthly' | 'monthly'

export type ModuleHighlight = {
  moduleId: string
  moduleLabel: string
  usageCount: number
  conclusions: string[]
}

export type ProgressReportStats = {
  totalPoints: number
  tasksCompleted: number
  tasksCreated: number
  projectsCompleted: number
  habitCompletions: number
  goalsProgress: Array<{ title: string; progressPercent: number }>
  topCategories: Array<{ category: string; points: number }>
}

export type ProgressReportDocument = {
  periodType: ReportPeriodType
  periodLabel: string
  periodStart: string
  periodEnd: string
  generatedAt: string
  stats: ProgressReportStats
  moduleHighlights: ModuleHighlight[]
  accomplishments: string[]
  narrativeSummary: string
  highlightsBullets: string[]
  coverArtPrompt: string
}

export type ProgressReportQuota = {
  isPremium: boolean
  canGenerate: boolean
  reportsUsedThisWeek: number
  weeklyLimit: number
  nextAvailableAt: string | null
  message?: string
}
