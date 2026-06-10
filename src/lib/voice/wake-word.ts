export const WAKE_WORD_STORAGE_KEY = 'lifestacks-wake-word-enabled'

const WAKE_PHRASE_PATTERNS = [
  /\bhey[\s,]+life[\s-]?stacks\b/i,
  /\bhey[\s,]+lifestacks\b/i,
  /\bhi[\s,]+life[\s-]?stacks\b/i,
  /\bokay[\s,]+life[\s-]?stacks\b/i,
]

export function isWakeWordSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function containsWakePhrase(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return false
  return WAKE_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized))
}

/** Text spoken after the wake phrase, if any. */
export function extractRemainderAfterWakePhrase(text: string): string {
  let remainder = text
  for (const pattern of WAKE_PHRASE_PATTERNS) {
    remainder = remainder.replace(pattern, '')
  }
  return remainder.replace(/^[\s,.-]+/, '').trim()
}

export function readWakeWordEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(WAKE_WORD_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeWakeWordEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(enabled))
  } catch {
    /* ignore storage errors */
  }
}
