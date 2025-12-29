/**
 * Supabase Admin Client
 *
 * This module provides a server-only Supabase client with service role privileges.
 * It bypasses Row Level Security (RLS) and should only be used in server-side code.
 *
 * ⚠️ SECURITY WARNING: Never import this in client-side code or expose it to the browser.
 * The service role key has full database access.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getServerEnv } from './env'

// Ensure this is only used on the server
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin can only be used on the server')
}

/**
 * Creates a Supabase admin client with service role privileges
 * This client bypasses RLS and should only be used in server-side API routes
 */
export function createAdminClient() {
  const env = getServerEnv()

  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. This is required for admin operations.'
    )
  }

  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Gets the authenticated user ID from the current request/session
 * Throws an error if the user is not authenticated
 *
 * This uses the repo's auth pattern (Supabase Auth via cookies)
 */
export async function getUserIdOrThrow(): Promise<string> {
  // Import the server client dynamically to avoid circular dependencies
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: User must be authenticated')
  }

  return user.id
}
