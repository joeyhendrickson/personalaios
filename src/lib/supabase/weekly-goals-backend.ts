import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * Server-only client for `weekly_goals` after `getUser()` has verified identity.
 *
 * Prefer the service role so dashboard Projects match table contents in Supabase; the SQL editor
 * bypasses RLS, while the anon key + JWT is subject to RLS and can return zero rows incorrectly.
 *
 * Queries must still filter by `.eq('user_id', authenticatedUser.id)`.
 *
 * Falls back to the cookie-scoped client when `SUPABASE_SERVICE_ROLE_KEY` is unset (local dev).
 */
export async function createWeeklyGoalsBackendClient(): Promise<{
  client: SupabaseClient
  usesServiceRole: boolean
}> {
  try {
    return { client: createAdminClient(), usesServiceRole: true }
  } catch {
    return { client: await createClient(), usesServiceRole: false }
  }
}
