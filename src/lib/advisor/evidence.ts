import type { AdvisorEvidence } from '@/types/advisor-evidence'

/** Client-safe: decode evidence from chat response headers only. */
export function decodeAdvisorEvidenceHeader(header: string | null): AdvisorEvidence | null {
  if (!header) return null
  try {
    return JSON.parse(decodeURIComponent(header)) as AdvisorEvidence
  } catch {
    try {
      return JSON.parse(header) as AdvisorEvidence
    } catch {
      return null
    }
  }
}

/** Server-safe header encoding (also usable from API routes). */
export function encodeAdvisorEvidenceHeader(evidence: AdvisorEvidence): string {
  return encodeURIComponent(JSON.stringify(evidence))
}
