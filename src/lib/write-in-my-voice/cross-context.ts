import 'server-only'

import { embedText } from '@/lib/ai/embeddings'
import { queryAdvisorVectors } from '@/lib/advisor-vector/client'
import { isAdvisorRagEnabled } from '@/lib/advisor-vector/config'
import { assembleAIContext } from '@/lib/ai-context/assemble-context'
import { detectQuestionTopics } from '@/lib/ai-context/topic-module-filter'
import { WRITE_IN_MY_VOICE_MODULE_ID } from './constants'
import type { CrossContextBundle } from './types'

/**
 * Retrieves voice-corpus excerpts (module-scoped) plus cross-module profile context
 * when the user's prompt relates to other LifeStacks data.
 */
export async function buildCrossContextForGeneration(input: {
  userId: string
  prompt: string
}): Promise<CrossContextBundle> {
  const voiceCorpusExcerpts: string[] = []
  const relevantModules = new Set<string>()

  if (isAdvisorRagEnabled()) {
    const queryVector = await embedText(input.prompt)
    if (queryVector) {
      const voiceMatches = await queryAdvisorVectors(input.userId, queryVector, 6, [
        WRITE_IN_MY_VOICE_MODULE_ID,
      ])
      for (const m of voiceMatches) {
        if (m.score >= 0.45 && m.preview) {
          voiceCorpusExcerpts.push(m.preview)
        }
      }
    }
  }

  const topics = detectQuestionTopics(input.prompt)
  const hasCrossModuleSignal = topics.length > 0

  let crossModuleContext = ''
  if (hasCrossModuleSignal) {
    try {
      const assembled = await assembleAIContext(input.userId, {
        messages: [{ role: 'user', content: input.prompt }],
        currentModule: WRITE_IN_MY_VOICE_MODULE_ID,
        filterModulesByQuestion: true,
      })

      crossModuleContext = assembled.systemContext
        .split('\n')
        .filter((line) => !line.toLowerCase().includes('write in my voice'))
        .join('\n')
        .trim()

      for (const mod of assembled.modulesIncluded ?? []) {
        if (mod !== WRITE_IN_MY_VOICE_MODULE_ID) relevantModules.add(mod)
      }
      for (const topic of topics) {
        relevantModules.add(topic)
      }
    } catch (e) {
      console.warn('[WriteInMyVoice] cross-context assembly failed:', e)
    }
  }

  return {
    voiceCorpusExcerpts,
    crossModuleContext,
    relevantModules: Array.from(relevantModules),
  }
}
