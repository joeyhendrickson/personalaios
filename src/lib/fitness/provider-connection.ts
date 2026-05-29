import type { SupabaseClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/crypto'
import { refreshGoogleHealthToken } from '@/lib/google-health'

export const HEALTH_PROVIDER = 'google_health'

export interface FitnessProviderConnection {
  id: string
  user_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scope: string | null
  provider_user_id: string | null
  connected_email: string | null
  import_sleep: boolean
  import_resting_heart_rate: boolean
  import_steps: boolean
  status: 'connected' | 'needs_reauth'
  last_synced_at: string | null
  last_sync_error: string | null
}

export async function getHealthConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<FitnessProviderConnection | null> {
  const { data, error } = await supabase
    .from('fitness_provider_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', HEALTH_PROVIDER)
    .maybeSingle()

  if (error) {
    // Table missing → treat as not connected so the page still loads.
    if (error.code === '42P01') return null
    throw new Error(error.message)
  }
  return (data as FitnessProviderConnection) ?? null
}

/**
 * Returns a usable Google Health access token, transparently refreshing it when expired.
 * Marks the connection as needs_reauth (and rethrows) when the refresh fails.
 */
export async function getValidHealthAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accessToken: string; connection: FitnessProviderConnection }> {
  const connection = await getHealthConnection(supabase, userId)
  if (!connection || !connection.access_token || !connection.refresh_token) {
    throw new Error('Google Health is not connected')
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0
  const stillValid = expiresAt - Date.now() > 60_000 // 60s safety margin

  if (stillValid) {
    return { accessToken: decrypt(connection.access_token), connection }
  }

  try {
    const refreshed = await refreshGoogleHealthToken(decrypt(connection.refresh_token))
    const newExpiresAt = refreshed.expiry_date
      ? new Date(refreshed.expiry_date).toISOString()
      : new Date(Date.now() + 3600_000).toISOString()

    await supabase
      .from('fitness_provider_connections')
      .update({
        access_token: encrypt(refreshed.access_token),
        refresh_token: encrypt(refreshed.refresh_token || decrypt(connection.refresh_token)),
        token_expires_at: newExpiresAt,
        scope: refreshed.scope ?? connection.scope,
        status: 'connected',
        last_sync_error: null,
      })
      .eq('id', connection.id)

    return {
      accessToken: refreshed.access_token,
      connection: { ...connection, status: 'connected', token_expires_at: newExpiresAt },
    }
  } catch (err) {
    await supabase
      .from('fitness_provider_connections')
      .update({
        status: 'needs_reauth',
        last_sync_error: err instanceof Error ? err.message : 'Token refresh failed',
      })
      .eq('id', connection.id)
    throw new Error('Google Health session expired. Please reconnect.')
  }
}
