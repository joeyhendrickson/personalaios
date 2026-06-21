export const WAKE_WORD_STORAGE_KEY = 'lifestacks-wake-word-enabled'

const WAKE_PHRASE_PATTERNS = [
  /\bhey[\s,]+life[\s-]?stacks?\b/i,
  /\bhey[\s,]+lifestacks?\b/i,
  /\bhi[\s,]+life[\s-]?stacks?\b/i,
  /\bokay[\s,]+life[\s-]?stacks?\b/i,
  /\bok[\s,]+life[\s-]?stacks?\b/i,
  /\bhey[\s,]+live[\s-]?stacks?\b/i,
]

/** Normalize STT output so common mis-hearings still match wake phrases. */
export function normalizeTranscriptForWakeWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'´`]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\blifes\b/g, 'life')
    .replace(/\blife\s+s\b/g, 'life')
    .replace(/\blives\b/g, 'life')
    .replace(/\blive\b/g, 'life')
    .replace(/\blife\s+stack\b/g, 'life stacks')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isWakeWordSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function containsWakePhrase(text: string): boolean {
  const normalized = normalizeTranscriptForWakeWord(text)
  if (!normalized) return false
  return WAKE_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized))
}

/** Text spoken after the wake phrase, if any. */
export function extractRemainderAfterWakePhrase(text: string): string {
  const normalized = normalizeTranscriptForWakeWord(text)
  let remainder = normalized
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
