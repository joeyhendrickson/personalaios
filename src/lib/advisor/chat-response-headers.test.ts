import { describe, expect, it } from 'vitest'
import { MAX_ADVISOR_RESPONSE_HEADER_CHARS, buildAdvisorChatHeaders } from './chat-response-headers'
import type { AdvisorEvidence } from '@/types/advisor-evidence'

function evidence(overrides: Partial<AdvisorEvidence> = {}): AdvisorEvidence {
  return {
    confidenceLevel: 'medium',
    confidenceScore: 60,
    confidenceRationale: ['Used cache'],
    routingSummary: 'Broad question',
    detectedTopics: [],
    topicFilterApplied: false,
    isBroadQuestion: true,
    modulesIncluded: ['budget-optimizer'],
    moduleOrder: ['budget-optimizer'],
    modules: [
      {
        moduleId: 'budget-optimizer',
        label: 'Budget Master',
        priorityRank: 1,
        recordCount: 12,
        categories: ['financial'],
        objectiveFacts: ['Income $4,000'],
        subjectiveNotes: [],
        recentHighlights: ['Groceries $120'],
        includedInPrompt: true,
      },
    ],
    layersIncluded: ['structured'],
    usedCache: true,
    ...overrides,
  }
}

describe('buildAdvisorChatHeaders', () => {
  it('always includes a text content type', () => {
    const headers = buildAdvisorChatHeaders({})
    expect(headers['Content-Type']).toBe('text/plain; charset=utf-8')
    expect(headers['X-Advisor-Evidence']).toBeUndefined()
  })

  it('encodes compact source chips and evidence', () => {
    const headers = buildAdvisorChatHeaders({
      sourceChips: [{ moduleId: 'budget-optimizer', label: 'Budget Master' }],
      evidence: evidence(),
    })
    expect(headers['X-Advisor-Sources']).toContain('Budget')
    expect(headers['X-Advisor-Evidence']).toBeTruthy()
    expect(headers['X-Advisor-Evidence']!.length).toBeLessThanOrEqual(
      MAX_ADVISOR_RESPONSE_HEADER_CHARS
    )
  })

  it('does not throw or emit oversized evidence headers', () => {
    const hugeFacts = Array.from({ length: 80 }, (_, i) => `Fact ${i}: ${'x'.repeat(400)}`)
    const headers = buildAdvisorChatHeaders({
      evidence: evidence({
        modules: Array.from({ length: 20 }, (_, i) => ({
          moduleId: `module-${i}`,
          label: `Module ${i}`,
          priorityRank: i + 1,
          recordCount: 999,
          categories: ['financial', 'wellness'],
          objectiveFacts: hugeFacts,
          subjectiveNotes: hugeFacts,
          recentHighlights: hugeFacts,
          includedInPrompt: true,
        })),
      }),
    })

    expect(headers['Content-Type']).toBe('text/plain; charset=utf-8')
    if (headers['X-Advisor-Evidence']) {
      expect(headers['X-Advisor-Evidence'].length).toBeLessThanOrEqual(
        MAX_ADVISOR_RESPONSE_HEADER_CHARS
      )
    }
  })
})
