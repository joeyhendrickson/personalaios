export type AdvisorVectorSourceType =
  | 'profile'
  | 'dashboard'
  | 'module_fact'
  | 'module_note'
  | 'module_highlight'
  | 'module_summary'
  | 'cross_module'
  | 'derived'

export type AdvisorVectorChunk = {
  chunkId: string
  text: string
  contentHash: string
  moduleId?: string
  sourceType: AdvisorVectorSourceType
  label: string
}

export type AdvisorRetrievedChunk = {
  chunkId: string
  label: string
  moduleId?: string
  sourceType: AdvisorVectorSourceType
  preview: string
  score: number
  includedInPrompt: boolean
}

export type AdvisorVectorSyncResult = {
  success: boolean
  skipped?: boolean
  skipReason?: string
  chunksUpserted: number
  chunksDeleted: number
  totalChunks: number
  durationMs: number
  error?: string
}

export type AdvisorVectorRetrieveResult = {
  chunks: AdvisorRetrievedChunk[]
  usedRag: boolean
  latencyMs: number
  indexFresh: boolean
  indexAgeHours?: number
}
