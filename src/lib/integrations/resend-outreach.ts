import 'server-only'

import { Resend } from 'resend'
import { z } from 'zod'
import type { EmailSendRequest, EmailSendResult } from './providers/types'

const fromSchema = z.string().email().or(z.string().min(3))

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

export function getResendFromEmail(): string | null {
  const v = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM
  const parsed = fromSchema.safeParse(v)
  return parsed.success ? parsed.data : null
}

export async function sendRelationshipEmail(req: EmailSendRequest): Promise<EmailSendResult> {
  const client = getClient()
  const from = getResendFromEmail()
  if (!client || !from) {
    return {
      success: false,
      error: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured',
    }
  }
  try {
    const { data, error } = await client.emails.send({
      from,
      to: req.to,
      subject: req.subject,
      html: req.html,
      text: req.text,
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, messageId: data?.id }
  } catch (e) {
    const err = e as { message?: string }
    return { success: false, error: err.message ?? 'Resend send failed' }
  }
}
