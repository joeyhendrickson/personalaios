import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }

  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey)
}

export type CoachSetupRegistrationMetadata = {
  name?: string
  phone?: string
  focusNotes?: string
  acceptedTerms?: boolean
  userId?: string
}

export function normalizeCoachSetupRegistration(metadata: CoachSetupRegistrationMetadata = {}) {
  return {
    full_name: metadata.name?.trim() || 'Coach session client',
    phone: metadata.phone?.trim() || null,
    focus_notes: metadata.focusNotes?.trim() || null,
    terms_accepted: Boolean(metadata.acceptedTerms),
    user_id: metadata.userId?.trim() || null,
  }
}
