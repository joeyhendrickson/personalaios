import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type NutritionPreferences = {
  diet_type: string | null
  diet_modifications: string[]
  updated_at: string
}

async function getPrefsFromRow(row: any): Promise<NutritionPreferences> {
  const assessment = (row?.assessment_data || {}) as any
  const prefs = (assessment?.nutrition_preferences || {}) as any
  return {
    diet_type: typeof prefs.diet_type === 'string' ? prefs.diet_type : null,
    diet_modifications: Array.isArray(prefs.diet_modifications) ? prefs.diet_modifications : [],
    updated_at: typeof prefs.updated_at === 'string' ? prefs.updated_at : new Date().toISOString(),
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Prefer profiles, fallback to user_profiles (mirrors Dream Catcher save behavior)
    const profilesRes = await supabase
      .from('profiles')
      .select('assessment_data')
      .eq('id', user.id)
      .maybeSingle()
    if (profilesRes.data) {
      const prefs = await getPrefsFromRow(profilesRes.data)
      return NextResponse.json({ preferences: prefs })
    }

    const userProfilesRes = await supabase
      .from('user_profiles')
      .select('assessment_data')
      .eq('user_id', user.id)
      .maybeSingle()
    const prefs = await getPrefsFromRow(userProfilesRes.data)
    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch nutrition preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const diet_type = typeof body.diet_type === 'string' ? body.diet_type : null
    const diet_modifications = Array.isArray(body.diet_modifications) ? body.diet_modifications : []

    const patch = {
      nutrition_preferences: {
        diet_type,
        diet_modifications,
        updated_at: new Date().toISOString(),
      },
    }

    // Collect the underlying DB errors so we can surface a useful message if every
    // strategy fails. Tables that don't exist (42P01) are skipped, not fatal.
    const errors: string[] = []
    const tableMissing = (err: { code?: string } | null) => err?.code === '42P01'

    // 1) Canonical profiles row (id = auth user id). Only update if the row exists.
    const profilesGet = await supabase
      .from('profiles')
      .select('assessment_data')
      .eq('id', user.id)
      .maybeSingle()
    if (profilesGet.data) {
      const existing = (profilesGet.data.assessment_data || {}) as any
      const next = { ...existing, ...patch }
      const upd = await supabase
        .from('profiles')
        .update({ assessment_data: next })
        .eq('id', user.id)
        .select('assessment_data')
        .maybeSingle()
      if (!upd.error && upd.data) {
        return NextResponse.json({ success: true, preferences: await getPrefsFromRow(upd.data) })
      }
      if (upd.error) errors.push(`profiles update: ${upd.error.message}`)
    } else if (profilesGet.error && !tableMissing(profilesGet.error)) {
      errors.push(`profiles read: ${profilesGet.error.message}`)
    }

    // 2) Legacy user_profiles row (user_id = auth user id).
    const userProfilesGet = await supabase
      .from('user_profiles')
      .select('assessment_data')
      .eq('user_id', user.id)
      .maybeSingle()
    if (userProfilesGet.data) {
      const existing = (userProfilesGet.data.assessment_data || {}) as any
      const next = { ...existing, ...patch }
      const upd = await supabase
        .from('user_profiles')
        .update({ assessment_data: next, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select('assessment_data')
        .maybeSingle()
      if (!upd.error && upd.data) {
        return NextResponse.json({ success: true, preferences: await getPrefsFromRow(upd.data) })
      }
      if (upd.error) errors.push(`user_profiles update: ${upd.error.message}`)
    } else if (userProfilesGet.error && !tableMissing(userProfilesGet.error)) {
      errors.push(`user_profiles read: ${userProfilesGet.error.message}`)
    }

    // 3) No existing profile row anywhere — create the canonical profiles row.
    const created = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email, assessment_data: { ...patch } },
        { onConflict: 'id' }
      )
      .select('assessment_data')
      .maybeSingle()
    if (!created.error && created.data) {
      return NextResponse.json({ success: true, preferences: await getPrefsFromRow(created.data) })
    }
    if (created.error) errors.push(`profiles upsert: ${created.error.message}`)

    throw new Error(errors.join(' | ') || 'No profile row could be updated')
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to save nutrition preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
