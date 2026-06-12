/**
 * AI Context Cache types
 * Four-layer model: static profile, structured state, derived insights, ephemeral
 */

export interface StaticProfileSummary {
  name?: string
  personalityTraits?: string[]
  personalInsights?: string[]
  dreamsDiscovered?: string[]
  visionStatement?: string
  executiveSkills?: Record<string, unknown>
  blockingFactors?: string[]
  longTermGoals?: string[]
  preferences?: Record<string, unknown>
}

export interface StructuredStateSummary {
  weeklyPoints: number
  dailyPoints: number
  /** Active (not completed/cancelled) rows in `goals` */
  totalGoals: number
  /** Active (not completed/cancelled) rows in `projects` (dashboard Projects panel) */
  totalDashboardProjects?: number
  /** Completed/cancelled goals — for context only, not workload counts */
  completedGoalsCount?: number
  /** Completed/cancelled dashboard projects — for context only */
  completedProjectsCount?: number
  /** Completed/cancelled tasks — for context only */
  completedTasksCount?: number
  /** How many projects are linked to any goal (via projects.goal_id) */
  linkedProjectsCount?: number
  /** Projects with no goal_id set */
  orphanProjectsCount?: number
  /** Goals with at least one linked project */
  goalsWithProjectsCount?: number
  /** Open (not completed/cancelled) tasks only */
  totalTasks: number
  totalHabits: number
  activePriorities: number
  completedTasksToday: number
  habitCompletionsToday: number
  completedTodayList?: Array<{ title: string; category?: string }>
  categories: string[]
  installedModules: string[]
  topGoals: Array<{ title: string; category?: string; progress: string; goalType?: string }>
  topDashboardProjects?: Array<{ title: string; category?: string; progress: string }>
  topTasks: Array<{ title: string; category?: string; status: string }>
  topPriorities: Array<{ title: string; level?: string }>
  topHabits?: string[]
  firePriorities: Array<{ title: string }>
  moduleSummaries: Array<{ moduleId: string; summary: string }>
  relationships?: Array<{ name: string; lastInteraction?: string }>
}

export interface DerivedInsightsSummary {
  overallProgress?: string
  strengths?: string[]
  areasForImprovement?: string[]
  recommendations?: string[]
  goalAlignment?: string
  productivityScore?: number
  nextSteps?: string[]
}

/** Per-module snapshot for Advisor prompts — objective facts + subjective user content */
export interface ModuleContextSummary {
  moduleId: string
  hasData: boolean
  recordCount: number
  /** Advisory categories this module supports (financial, emotional, wellness, etc.) */
  categories: string[]
  objectiveFacts: string[]
  subjectiveNotes: string[]
  recentHighlights: string[]
  /** AI-compressed summary for large modules (cache refresh only) */
  aiSummary?: string
}

/** Precomputed cross-module signal for decision-tree reasoning in chat */
export interface CrossModuleInsight {
  id: string
  category: string
  insight: string
  relatedModules: string[]
  suggestedFollowUp?: string
}

export interface CrossModuleInsightsSummary {
  insights: CrossModuleInsight[]
  emotionalThemes?: string[]
  financialSnapshot?: {
    monthIncome?: number
    monthExpenses?: number
    monthNet?: number
    tradingTransferTotal?: number
    topSpendingCategories?: string[]
  }
}

export interface UserContextCacheRow {
  id: string
  user_id: string
  static_profile_summary_json: StaticProfileSummary | null
  structured_state_summary_json: StructuredStateSummary | null
  derived_insights_summary_json: DerivedInsightsSummary | null
  module_context_summary_json: ModuleContextSummary[] | null
  cross_module_insights_json: CrossModuleInsightsSummary | null
  cache_version: number
  source_data_checksum: string | null
  last_full_refresh_at: string | null
  last_incremental_refresh_at: string | null
  refresh_status: string
  refresh_error: string | null
  created_at: string
  updated_at: string
}

export interface AssembleContextOptions {
  /** Include recent conversation messages (ephemeral) */
  messages?: Array<{ role: string; content: string }>
  /** Current module/page for module-specific context */
  currentModule?: string
  /** Max tokens for assembled context (soft limit) */
  maxTokens?: number
  /** Force live fetch if cache is stale (default: use cache when available) */
  preferLiveIfStale?: boolean
  /** Filter module context to question-relevant modules (default: true when messages present) */
  filterModulesByQuestion?: boolean
}

export interface AssembledContext {
  /** Full system-ready context string for prompts */
  systemContext: string
  /** Metadata for logging */
  usedCache: boolean
  cacheAgeHours?: number
  layersIncluded: ('static' | 'structured' | 'derived' | 'modules' | 'cross_module' | 'ephemeral')[]
  /** Module IDs included after topic filtering (if applied) */
  modulesIncluded?: string[]
  topicFilterApplied?: boolean
}
