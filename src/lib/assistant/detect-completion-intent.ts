/**
 * Detect when the user is reporting they finished a task or habit (not creating new items).
 */

export type CompletionIntent = { type: 'complete'; query: string } | null

const COMPLETION_PREFIX_PATTERNS: RegExp[] = [
  /^(?:i\s+)?(?:just\s+)?(?:finished|completed|done with|did|checked off|knocked out|finished up on)\s+(.+)/i,
  /^mark\s+(.+?)\s+(?:as\s+)?(?:complete|done|finished)/i,
  /^(.+?)\s+is\s+(?:done|complete|finished)(?:\s+now)?\.?$/i,
  /^(?:i\s+)?(?:logged|tracked|did)\s+(?:my\s+)?(.+?)\s+(?:habit|today)/i,
]

const NON_COMPLETION_PATTERNS: RegExp[] = [
  /add (this|these|it|them|that|the conversation)/i,
  /create (a |an |the )?(new )?(goal|project|task|habit)/i,
  /turn (this|the conversation)/i,
  /generate (a )?dashboard plan/i,
  /how (did|was|many|much)/i,
  /what (did|was|is|are)/i,
  /why (did|was|is|are)/i,
  /when (did|was|is|are)/i,
  /tell me about/i,
  /plan my/i,
  /help me plan/i,
]

function cleanQuery(raw: string): string {
  return raw
    .trim()
    .replace(/\s+(please|thanks|thank you|today|for today|now)\.?$/i, '')
    .replace(/^my\s+/i, '')
    .replace(/^the\s+/i, '')
    .replace(/\s+(task|habit)$/i, '')
    .trim()
}

export function detectCompletionIntent(message: string): CompletionIntent {
  const t = message.trim()
  if (!t || t.length < 4) return null
  if (NON_COMPLETION_PATTERNS.some((p) => p.test(t))) return null

  for (const pattern of COMPLETION_PREFIX_PATTERNS) {
    const match = t.match(pattern)
    if (match?.[1]) {
      const query = cleanQuery(match[1])
      if (query.length >= 2) return { type: 'complete', query }
    }
  }

  if (/^(finished|done|completed)\.?$/i.test(t)) {
    return { type: 'complete', query: '' }
  }

  return null
}
