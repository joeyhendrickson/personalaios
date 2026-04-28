import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateTwilioConfig, fetchMessageStatus } from '@/lib/integrations/twilio-sms'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const v = validateTwilioConfig()
  if (!v.ok) {
    return NextResponse.json({
      configured: false,
      errors: v.errors,
    })
  }

  const { searchParams } = new URL(request.url)
  const sid = searchParams.get('messageSid')
  if (sid) {
    const status = await fetchMessageStatus(sid)
    return NextResponse.json({ configured: true, lookup: status })
  }

  return NextResponse.json({
    configured: true,
    accountPreview: `${v.config.accountSid.slice(0, 6)}…`,
    fromPreview: `${v.config.fromNumber.slice(0, 4)}…`,
  })
}
