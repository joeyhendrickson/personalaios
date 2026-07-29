import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function createSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }

  return createServiceClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey)
}

export type WorkshopRegistrationMetadata = {
  name?: string
  phone?: string
  onSiteStay?: boolean
  acceptedTerms?: boolean
}

export function normalizeWorkshopRegistration(metadata: WorkshopRegistrationMetadata = {}) {
  return {
    full_name: metadata.name?.trim() || 'Workshop registrant',
    phone: metadata.phone?.trim() || null,
    on_site_stay: Boolean(metadata.onSiteStay),
    terms_accepted: Boolean(metadata.acceptedTerms),
  }
}
