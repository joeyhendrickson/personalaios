import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'

export function createClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured')
  }
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
