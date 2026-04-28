import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * Twilio status callback: configure in Twilio console on Messaging Service / phone number.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = request.headers.get('x-twilio-signature')
  const form = await request.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => {
    params[k] = v.toString()
  })

  if (authToken && signature) {
    const url = request.nextUrl.toString()
    const ok = twilio.validateRequest(authToken, signature, url, params)
    if (!ok) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }
  }

  const messageSid = params.MessageSid
  const messageStatus = params.MessageStatus

  if (!messageSid) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    await supabase
      .from('sent_messages')
      .update({
        status: messageStatus ?? 'unknown',
        metadata: { twilio_last_status: messageStatus },
      })
      .eq('provider', 'twilio')
      .eq('provider_message_id', messageSid)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
