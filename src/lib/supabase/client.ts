import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Access NEXT_PUBLIC_* variables directly on client side
  // These are bundled at build time by Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
