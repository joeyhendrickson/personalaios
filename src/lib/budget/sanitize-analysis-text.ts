/** True when a string is raw model JSON/code rather than a human sentence. */
export function looksLikeCodeDump(text: string | null | undefined): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('```')) return true
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true
  if (trimmed.includes('"financial_health"') && trimmed.includes('{')) return true
  const symbolCount = (trimmed.match(/[{}\[\]"]/g) || []).length
  return trimmed.length > 180 && symbolCount > trimmed.length * 0.12
}

export function sanitizeAnalysisText(text: string | null | undefined, fallback: string): string {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed || looksLikeCodeDump(trimmed)) return fallback
  return trimmed
}
