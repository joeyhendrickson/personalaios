import type { AdvisorEvidence } from '@/types/advisor-evidence'
import { encodeAdvisorEvidenceHeader } from '@/lib/advisor/evidence'

/** Stay under typical proxy / Vercel request-header limits. */
export const MAX_ADVISOR_RESPONSE_HEADER_CHARS = 6000

function list<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function slimAdvisorEvidence(evidence: AdvisorEvidence): AdvisorEvidence {
  return {
    ...evidence,
    confidenceRationale: list(evidence.confidenceRationale).slice(0, 2),
    modules: list(evidence.modules).map((mod) => ({
      ...mod,
      categories: list(mod.categories),
      objectiveFacts: list(mod.objectiveFacts).slice(0, 2),
      subjectiveNotes: [],
      recentHighlights: list(mod.recentHighlights).slice(0, 1),
    })),
    retrievedChunks: list(evidence.retrievedChunks)
      .slice(0, 3)
      .map((chunk) => ({
        ...chunk,
        preview: (chunk.preview ?? '').slice(0, 80),
      })),
  }
}

function stubAdvisorEvidence(evidence: AdvisorEvidence): AdvisorEvidence {
  return {
    ...evidence,
    confidenceRationale: [],
    appliedAdjustments: undefined,
    contextAdjustments: undefined,
    modules: list(evidence.modules).map((mod) => ({
      ...mod,
      categories: list(mod.categories).slice(0, 2),
      objectiveFacts: [],
      subjectiveNotes: [],
      recentHighlights: [],
    })),
    retrievedChunks: undefined,
  }
}

function encodeIfFits(value: string): string | undefined {
  return value.length <= MAX_ADVISOR_RESPONSE_HEADER_CHARS ? value : undefined
}

/**
 * Chat streaming headers. Oversized evidence must never throw or drop the reply.
 */
export function buildAdvisorChatHeaders(input: {
  sourceChips?: Array<{ moduleId: string; label: string }>
  evidence?: AdvisorEvidence | null
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
  }

  try {
    if (input.sourceChips?.length) {
      const encoded = encodeIfFits(encodeURIComponent(JSON.stringify(input.sourceChips)))
      if (encoded) headers['X-Advisor-Sources'] = encoded
    }

    if (input.evidence) {
      const candidates = [
        input.evidence,
        slimAdvisorEvidence(input.evidence),
        stubAdvisorEvidence(input.evidence),
      ]
      for (const evidence of candidates) {
        const encoded = encodeIfFits(encodeAdvisorEvidenceHeader(evidence))
        if (encoded) {
          headers['X-Advisor-Evidence'] = encoded
          break
        }
      }
    }
  } catch (error) {
    console.error('[Advisor] Failed to encode chat response headers:', error)
  }

  return headers
}
