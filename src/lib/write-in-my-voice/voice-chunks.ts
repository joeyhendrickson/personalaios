import { hashContent } from '@/lib/relationship-manager/mbox/mbox-embeddings'
import type { AdvisorVectorChunk } from '@/lib/advisor-vector/types'
import {
  profileSummaryChunkId,
  sampleChunkId,
  VOICE_CHUNK_SIZE,
  WRITE_IN_MY_VOICE_MODULE_ID,
} from './constants'
import type { VoiceProfile } from './types'

export function splitTextIntoChunks(text: string, chunkSize = VOICE_CHUNK_SIZE): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  if (normalized.length <= chunkSize) return [normalized]

  const chunks: string[] = []
  let start = 0
  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length)
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(' ', end)
      if (lastSpace > start + chunkSize * 0.5) end = lastSpace
    }
    chunks.push(normalized.slice(start, end).trim())
    start = end
  }
  return chunks.filter((c) => c.length >= 40)
}

export function buildVoiceCorpusChunks(input: {
  samples: Array<{ id: string; source_type: string; content_text: string; file_name: string }>
  voiceProfile?: VoiceProfile | null
}): AdvisorVectorChunk[] {
  const out: AdvisorVectorChunk[] = []
  const seen = new Set<string>()

  const push = (chunk: AdvisorVectorChunk | null) => {
    if (!chunk || seen.has(chunk.chunkId)) return
    seen.add(chunk.chunkId)
    out.push(chunk)
  }

  for (const sample of input.samples) {
    const parts = splitTextIntoChunks(sample.content_text)
    parts.forEach((text, i) => {
      push({
        chunkId: sampleChunkId(sample.id, i),
        text: `[${sample.source_type}] ${text}`,
        contentHash: hashContent(text),
        moduleId: WRITE_IN_MY_VOICE_MODULE_ID,
        sourceType: 'module_note',
        label: `Voice sample: ${sample.file_name} (${i + 1}/${parts.length})`,
      })
    })
  }

  if (input.voiceProfile) {
    const p = input.voiceProfile
    const summary = [
      `Tone: ${p.tone}`,
      `Style: ${p.writing_style}`,
      `Themes: ${p.common_themes.join(', ')}`,
      `Signature phrases: ${p.signature_phrases.join(', ')}`,
      `Personal voice: ${p.personal_voice}`,
      `Do: ${p.do_list.join('; ')}`,
      `Avoid: ${p.avoid_list.join('; ')}`,
    ].join('\n')

    push({
      chunkId: profileSummaryChunkId(),
      text: summary,
      contentHash: hashContent(summary),
      moduleId: WRITE_IN_MY_VOICE_MODULE_ID,
      sourceType: 'module_summary',
      label: 'Write In My Voice profile summary',
    })
  }

  return out
}
