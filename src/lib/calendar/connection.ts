import type { SupabaseClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/crypto'
import { refreshGoogleCalendarToken } from '@/lib/google-calendar'

export const CALENDAR_PROVIDER = 'google_calendar'

export interface CalendarConnection {
  id: string
  user_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scope: string | null
  connected_email: string | null
  status: 'connected' | 'needs_reauth'
}

export async function getCalendarConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<CalendarConnection | null> {
  const { data, error } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', CALENDAR_PROVIDER)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw new Error(error.message)
  }
  return (data as CalendarConnection) ?? null
}

/**
 * Returns a usable Google Calendar access token, refreshing it when expired.
 * Marks the connection needs_reauth (and throws) when refresh fails.
 */
export async function getValidCalendarAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<{ accessToken: string; connection: CalendarConnection }> {
  const connection = await getCalendarConnection(supabase, userId)
  if (!connection || !connection.access_token || !connection.refresh_token) {
    throw new Error('Google Calendar is not connected')
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0
  const stillValid = expiresAt - Date.now() > 60_000

  if (stillValid) {
    return { accessToken: decrypt(connection.access_token), connection }
  }

  try {
    const refreshed = await refreshGoogleCalendarToken(decrypt(connection.refresh_token))
    const newExpiresAt = refreshed.expiry_date
      ? new Date(refreshed.expiry_date).toISOString()
      : new Date(Date.now() + 3600_000).toISOString()

    await supabase
      .from('calendar_connections')
      .update({
        access_token: encrypt(refreshed.access_token),
        refresh_token: encrypt(refreshed.refresh_token || decrypt(connection.refresh_token)),
        token_expires_at: newExpiresAt,
        scope: refreshed.scope ?? connection.scope,
        status: 'connected',
      })
      .eq('id', connection.id)

    return {
      accessToken: refreshed.access_token,
      connection: { ...connection, status: 'connected', token_expires_at: newExpiresAt },
    }
  } catch {
    await supabase
      .from('calendar_connections')
      .update({ status: 'needs_reauth' })
      .eq('id', connection.id)
    throw new Error('Google Calendar session expired. Please reconnect.')
  }
}
