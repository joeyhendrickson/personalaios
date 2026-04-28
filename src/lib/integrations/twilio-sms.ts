import 'server-only'

import { createHash } from 'crypto'
import twilio from 'twilio'
import { z } from 'zod'
import type { SmsSendRequest, SmsSendResult } from './providers/types'

const configSchema = z.object({
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  fromNumber: z.string().min(1),
})

export type TwilioConfig = z.infer<typeof configSchema>

export function getTwilioConfigFromEnv(): TwilioConfig | null {
  const parsed = configSchema.safeParse({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER,
  })
  return parsed.success ? parsed.data : null
}

export function validateTwilioConfig():
  | { ok: true; config: TwilioConfig }
  | { ok: false; errors: string[] } {
  const config = getTwilioConfigFromEnv()
  if (!config) {
    return {
      ok: false,
      errors: [
        'Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER (or TWILIO_FROM_NUMBER).',
      ],
    }
  }
  return { ok: true, config }
}

/** Fingerprint for audit logs — not reversible without rainbow tables on tiny space. */
export function fingerprintPhone(e164: string): string {
  return createHash('sha256').update(e164.trim()).digest('hex').slice(0, 32)
}

export function previewBody(body: string, max = 280): string {
  const t = body.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

/**
 * Sends SMS via Twilio. Call only from authenticated server routes after user confirms send.
 */
export async function sendSms(req: SmsSendRequest): Promise<SmsSendResult> {
  const v = validateTwilioConfig()
  if (!v.ok) {
    return { success: false, error: v.errors.join(' ') }
  }
  try {
    const client = twilio(v.config.accountSid, v.config.authToken)
    const message = await client.messages.create({
      to: req.toE164,
      from: v.config.fromNumber,
      body: req.body,
    })
    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
    }
  } catch (e) {
    const err = e as { message?: string; code?: number }
    return {
      success: false,
      error: err.message ?? 'Twilio request failed',
    }
  }
}

/**
 * Fetch delivery status for webhook reconciliation or manual refresh.
 */
export async function fetchMessageStatus(
  messageSid: string
): Promise<{ status?: string; error?: string }> {
  const v = validateTwilioConfig()
  if (!v.ok) {
    return { error: v.errors.join(' ') }
  }
  try {
    const client = twilio(v.config.accountSid, v.config.authToken)
    const msg = await client.messages(messageSid).fetch()
    return { status: msg.status }
  } catch (e) {
    const err = e as { message?: string }
    return { error: err.message ?? 'fetch failed' }
  }
}
