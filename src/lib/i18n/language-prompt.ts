import type { Language } from '@/contexts/language-context'

export function spanishResponseInstruction(language: Language | string | undefined): string {
  if (language === 'es') {
    return 'Respond in Spanish (español) for all user-facing text. Use natural, conversational Spanish.'
  }
  return 'Respond in English for all user-facing text.'
}

export function resolveLanguage(value: unknown): Language {
  return value === 'es' ? 'es' : 'en'
}

/** Resolve locale from JSON body field, X-Language header, or language cookie. */
export function resolveRequestLanguage(
  options: {
    bodyLanguage?: unknown
    headerLanguage?: string | null
    cookieLanguage?: string | null
  } = {}
): Language {
  const { bodyLanguage, headerLanguage, cookieLanguage } = options
  if (bodyLanguage === 'es' || bodyLanguage === 'en') return bodyLanguage
  if (headerLanguage === 'es' || headerLanguage === 'en') return headerLanguage
  if (cookieLanguage === 'es' || cookieLanguage === 'en') return cookieLanguage
  return 'en'
}
