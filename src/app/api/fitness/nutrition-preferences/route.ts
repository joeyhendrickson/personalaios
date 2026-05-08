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

    // Update profiles.assessment_data merge
    const profilesGet = await supabase
      .from('profiles')
      .select('assessment_data')
      .eq('id', user.id)
      .maybeSingle()
    if (!profilesGet.error) {
      const existing = (profilesGet.data?.assessment_data || {}) as any
      const next = { ...existing, ...patch }
      const upd = await supabase
        .from('profiles')
        .update({ assessment_data: next })
        .eq('id', user.id)
        .select('assessment_data')
        .maybeSingle()
      if (!upd.error) {
        return NextResponse.json({ success: true, preferences: await getPrefsFromRow(upd.data) })
      }
    }

    // Fallback to user_profiles
    const userProfilesGet = await supabase
      .from('user_profiles')
      .select('assessment_data')
      .eq('user_id', user.id)
      .maybeSingle()
    const existing2 = (userProfilesGet.data?.assessment_data || {}) as any
    const next2 = { ...existing2, ...patch }
    const upd2 = await supabase
      .from('user_profiles')
      .update({ assessment_data: next2, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select('assessment_data')
      .maybeSingle()

    if (upd2.error) throw new Error(upd2.error.message)
    return NextResponse.json({ success: true, preferences: await getPrefsFromRow(upd2.data) })
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
