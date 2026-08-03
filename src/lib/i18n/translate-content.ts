import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import type { Language } from '@/contexts/language-context'

export async function translateTexts(texts: string[], targetLanguage: Language): Promise<string[]> {
  const trimmed = texts.map((t) => (t ?? '').trim())
  if (targetLanguage === 'en') return trimmed

  const nonEmpty = trimmed.filter(Boolean)
  if (nonEmpty.length === 0) return trimmed

  const prompt = `Translate each item to Spanish. Preserve meaning, tone, and formatting. Return ONLY a JSON array of strings in the same order as the input.

Input:
${JSON.stringify(nonEmpty, null, 2)}`

  try {
    const result = await generateText({
      model: defaultOpenaiModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator for a productivity app. Output valid JSON arrays only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    })

    const parsed = JSON.parse(result.text) as string[]
    if (!Array.isArray(parsed) || parsed.length !== nonEmpty.length) {
      return trimmed
    }

    let index = 0
    return trimmed.map((text) => (text ? (parsed[index++] ?? text) : text))
  } catch {
    return trimmed
  }
}
