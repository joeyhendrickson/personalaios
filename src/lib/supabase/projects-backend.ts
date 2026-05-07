import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * Server-only client for the `projects` table (formerly `weekly_goals`) after `getUser()`
 * has verified identity.
 *
 * Prefer the service role so dashboard Projects match DB contents; anon + JWT follows RLS and
 * can diverge without the service role in server env.
 *
 * Queries must still filter `.eq('user_id', authenticatedUser.id)`.
 */
export async function createProjectsBackendClient(): Promise<{
  client: SupabaseClient
  usesServiceRole: boolean
}> {
  try {
    return { client: createAdminClient(), usesServiceRole: true }
  } catch {
    return { client: await createClient(), usesServiceRole: false }
  }
}
