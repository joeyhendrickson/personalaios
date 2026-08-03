import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateTexts } from '@/lib/i18n/translate-content'
import { resolveLanguage } from '@/lib/i18n/language-prompt'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const texts = Array.isArray(body.texts) ? body.texts.map(String) : []
    const targetLanguage = resolveLanguage(body.targetLanguage)

    if (texts.length === 0) {
      return NextResponse.json({ translations: [] })
    }

    if (texts.length > 40) {
      return NextResponse.json({ error: 'Too many texts (max 40)' }, { status: 400 })
    }

    const translations = await translateTexts(texts, targetLanguage)
    return NextResponse.json({ translations })
  } catch (error) {
    console.error('Translate API error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
