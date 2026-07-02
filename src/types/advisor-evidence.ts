/** Structured transparency payload for the Advisor Evidence tab. */
export type AdvisorConfidenceLevel = 'high' | 'medium' | 'low'

export type AdvisorModuleEvidence = {
  moduleId: string
  label: string
  priorityRank: number
  recordCount: number
  categories: string[]
  objectiveFacts: string[]
  subjectiveNotes: string[]
  recentHighlights: string[]
  includedInPrompt: boolean
}

export type AdvisorEvidence = {
  confidenceLevel: AdvisorConfidenceLevel
  confidenceScore: number
  confidenceRationale: string[]
  routingSummary: string
  detectedTopics: string[]
  topicFilterApplied: boolean
  isBroadQuestion: boolean
  modulesIncluded: string[]
  moduleOrder: string[]
  modules: AdvisorModuleEvidence[]
  layersIncluded: string[]
  usedCache: boolean
  cacheAgeHours?: number
  contextAdjustments?: string
  appliedAdjustments?: string[]
}

export type AdvisorContextAdjustments = {
  /** Raw user text from the Evidence tab */
  raw: string
  /** Boost these topics/modules first */
  prioritizeTopics: string[]
  deprioritizeTopics: string[]
  modulePriority: string[]
  /** Human-readable lines injected into the system prompt */
  promptLines: string[]
}
