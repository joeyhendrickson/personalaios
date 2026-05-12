import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .eq('email', user.email)
    .single()

  if (adminError || !adminUser) throw new Error('Admin access required')
  return user
}

// GET – list billing entries with optional ?provider= filter
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireAdmin(supabase)

    const url = new URL(request.url)
    const provider = url.searchParams.get('provider')

    let query = supabase
      .from('platform_billing_entries')
      .select('*')
      .order('charge_date', { ascending: false })
      .limit(200)

    if (provider) {
      query = query.eq('provider', provider)
    }

    const { data: entries, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Monthly summary
    const monthlySummary: Record<string, { total: number; byProvider: Record<string, number> }> = {}
    for (const entry of entries || []) {
      const month = entry.charge_date.substring(0, 7) // YYYY-MM
      if (!monthlySummary[month]) monthlySummary[month] = { total: 0, byProvider: {} }
      const amt = parseFloat(entry.amount) || 0
      monthlySummary[month].total += amt
      monthlySummary[month].byProvider[entry.provider] =
        (monthlySummary[month].byProvider[entry.provider] || 0) + amt
    }

    return NextResponse.json({ entries: entries || [], monthlySummary })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('Unauthorized') ? 401 : msg.includes('Admin') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

// POST – upload a screenshot, parse with AI vision, and save entries
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)

    const formData = await request.formData()
    const file = formData.get('screenshot') as File | null
    const provider = (formData.get('provider') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'screenshot file is required' }, { status: 400 })
    }
    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required (plaid, openai, etc.)' },
        { status: 400 }
      )
    }

    // Upload to Supabase storage
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `admin/billing/${provider}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('body-photos')
      .upload(storagePath, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload screenshot', details: uploadError.message },
        { status: 500 }
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('body-photos').getPublicUrl(storagePath)

    // Convert file to base64 for vision API
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/png'

    // Parse the screenshot with AI vision
    const result = await generateText({
      model: defaultOpenaiModel(),
      messages: [
        {
          role: 'system',
          content: `You are a billing data extraction assistant. You analyze screenshots of billing/invoicing pages and extract structured charge data.

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "entries": [
    {
      "charge_date": "YYYY-MM-DD",
      "description": "Brief description of the charge",
      "amount": 12.34,
      "billing_period": "Month Year or date range"
    }
  ],
  "provider_detected": "plaid or openai or other",
  "confidence": "high" | "medium" | "low",
  "notes": "Any relevant observations about the billing data"
}

Rules:
- Extract every individual line item / charge visible in the screenshot
- Amounts should be positive numbers (costs)
- Dates should be in YYYY-MM-DD format; use the first of the month if only a month is shown
- If you can't read a value clearly, make your best guess and set confidence to "medium" or "low"
- For OpenAI: look for API usage charges, model costs, token usage fees
- For Plaid: look for API call charges, item fees, identity verification fees, etc.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Parse all billing charges from this ${provider} billing screenshot. Extract every line item with date, description, and amount.`,
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64}`,
            },
          ],
        },
      ],
      temperature: 0.1,
    })

    let parsed: {
      entries: Array<{
        charge_date: string
        description: string
        amount: number
        billing_period?: string
      }>
      provider_detected?: string
      confidence?: string
      notes?: string
    }

    try {
      const cleaned = result.text.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        {
          error: 'Failed to parse AI response',
          raw_response: result.text,
          screenshot_url: publicUrl,
        },
        { status: 422 }
      )
    }

    if (!parsed.entries || !Array.isArray(parsed.entries) || parsed.entries.length === 0) {
      return NextResponse.json(
        {
          error: 'No billing entries found in the screenshot',
          parsed,
          screenshot_url: publicUrl,
        },
        { status: 422 }
      )
    }

    // Insert parsed entries into the database
    const toInsert = parsed.entries.map((entry) => ({
      provider,
      charge_date: entry.charge_date,
      description: entry.description,
      amount: entry.amount,
      billing_period: entry.billing_period || null,
      source_type: 'screenshot',
      screenshot_url: publicUrl,
      raw_parsed_data: parsed,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('platform_billing_entries')
      .insert(toInsert)
      .select()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save entries', details: insertError.message, parsed },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      entries_created: inserted?.length || 0,
      entries: inserted,
      parsed,
      screenshot_url: publicUrl,
    })
  } catch (error) {
    console.error('Platform billing parse error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('Unauthorized') ? 401 : msg.includes('Admin') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

// DELETE – remove a billing entry by ?id=
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireAdmin(supabase)

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const { error } = await supabase.from('platform_billing_entries').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    const status = msg.includes('Unauthorized') ? 401 : msg.includes('Admin') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
