'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/language-context'

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

async function fetchTranslation(text: string, language: 'es'): Promise<string> {
  const key = `${language}:${text}`
  const cached = cache.get(key)
  if (cached) return cached

  const pending = inflight.get(key)
  if (pending) return pending

  const promise = fetch('/api/i18n/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts: [text], targetLanguage: language }),
  })
    .then(async (res) => {
      if (!res.ok) return text
      const data = await res.json()
      const translated = data.translations?.[0] ?? text
      cache.set(key, translated)
      return translated
    })
    .catch(() => text)
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

export function useTranslatedText(text: string | null | undefined): string {
  const { language } = useLanguage()
  const source = (text ?? '').trim()
  const [display, setDisplay] = useState(source)

  useEffect(() => {
    if (!source || language === 'en') {
      setDisplay(source)
      return
    }

    const key = `${language}:${source}`
    const cached = cache.get(key)
    if (cached) {
      setDisplay(cached)
      return
    }

    let cancelled = false
    void fetchTranslation(source, 'es').then((translated) => {
      if (!cancelled) setDisplay(translated)
    })

    return () => {
      cancelled = true
    }
  }, [source, language])

  return display
}

export async function translateTextBatch(
  texts: string[],
  language: 'en' | 'es'
): Promise<string[]> {
  const trimmed = texts.map((t) => (t ?? '').trim())
  if (language === 'en') return trimmed

  const results = [...trimmed]
  const toFetch: { index: number; text: string }[] = []

  trimmed.forEach((text, index) => {
    if (!text) return
    const key = `${language}:${text}`
    const cached = cache.get(key)
    if (cached) {
      results[index] = cached
    } else {
      toFetch.push({ index, text })
    }
  })

  if (toFetch.length === 0) return results

  try {
    const res = await fetch('/api/i18n/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: toFetch.map((item) => item.text),
        targetLanguage: language,
      }),
    })
    if (!res.ok) return results
    const data = await res.json()
    const translations: string[] = data.translations ?? []
    toFetch.forEach((item, i) => {
      const translated = translations[i] ?? item.text
      cache.set(`${language}:${item.text}`, translated)
      results[item.index] = translated
    })
  } catch {
    // keep originals
  }

  return results
}
