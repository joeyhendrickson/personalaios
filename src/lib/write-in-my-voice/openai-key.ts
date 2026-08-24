import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'

export async function resolveUserOpenAIKey(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: credentials } = await supabase
    .from('project_plan_builder_credentials')
    .select('openai_api_key')
    .eq('user_id', userId)
    .single()

  if (credentials?.openai_api_key) {
    const key = decrypt(credentials.openai_api_key)
    if (key) return key
  }

  return process.env.OPENAI_API_KEY?.trim() || null
}
