import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseBrowserConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  return { supabaseUrl, supabaseAnonKey }
}

/** Returns a browser Supabase client, or null when public env vars are missing. */
export function createClientIfConfigured(): SupabaseClient | null {
  const config = getSupabaseBrowserConfig()
  if (!config) return null

  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey)
}

export function createClient() {
  const config = getSupabaseBrowserConfig()

  if (!config) {
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(config.supabaseUrl, config.supabaseAnonKey)
}
