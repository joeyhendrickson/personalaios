export type MessageChannel = 'sms' | 'email'

export interface SmsSendRequest {
  toE164: string
  body: string
  idempotencyKey?: string
}

export interface SmsSendResult {
  success: boolean
  messageSid?: string
  error?: string
  status?: string
}

export interface EmailSendRequest {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface PlacesSearchParams {
  query: string
  locationBias?: { lat: number; lng: number; radiusMeters?: number }
}

export interface NormalizedPlace {
  placeId: string
  name: string
  formattedAddress?: string
  lat?: number
  lng?: number
}

export interface EventbriteSearchParams {
  locationAddress?: string
  locationLatitude?: number
  locationLongitude?: number
  within?: string
  q?: string
  startDateRange?: { start: string; end: string }
}

export interface NormalizedExternalEvent {
  externalId: string
  title: string
  description?: string
  startAt?: Date
  url?: string
  venueName?: string
  lat?: number
  lng?: number
  zipCode?: string
  raw: Record<string, unknown>
}
