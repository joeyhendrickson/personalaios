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
  totalGoals: number
  totalTasks: number
  totalHabits: number
  activePriorities: number
  completedTasksToday: number
  habitCompletionsToday: number
  completedTodayList?: Array<{ title: string; category?: string }>
  categories: string[]
  installedModules: string[]
  topGoals: Array<{ title: string; category?: string; progress: string }>
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

export interface UserContextCacheRow {
  id: string
  user_id: string
  static_profile_summary_json: StaticProfileSummary | null
  structured_state_summary_json: StructuredStateSummary | null
  derived_insights_summary_json: DerivedInsightsSummary | null
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
}

export interface AssembledContext {
  /** Full system-ready context string for prompts */
  systemContext: string
  /** Metadata for logging */
  usedCache: boolean
  cacheAgeHours?: number
  layersIncluded: ('static' | 'structured' | 'derived' | 'ephemeral')[]
}
