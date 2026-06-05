import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type NutritionPreferences = {
  diet_type: string | null
  diet_modifications: string[]
  updated_at: string
}

function rowToPrefs(row: {
  diet_type?: string | null
  diet_modifications?: string[] | null
  updated_at?: string | null
}): NutritionPreferences {
  return {
    diet_type: typeof row.diet_type === 'string' ? row.diet_type : null,
    diet_modifications: Array.isArray(row.diet_modifications) ? row.diet_modifications : [],
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

const TABLE_MISSING_HINT =
  'The nutrition_preferences table is missing. Run migration 064_create_nutrition_preferences.sql.'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('nutrition_preferences')
      .select('diet_type, diet_modifications, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Table not found', details: TABLE_MISSING_HINT },
          {
            status: 500,
          }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      preferences: rowToPrefs(data || {}),
    })
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
    const diet_modifications = Array.isArray(body.diet_modifications)
      ? body.diet_modifications.filter((m: unknown): m is string => typeof m === 'string')
      : []

    const { data, error } = await supabase
      .from('nutrition_preferences')
      .upsert(
        {
          user_id: user.id,
          diet_type,
          diet_modifications,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('diet_type, diet_modifications, updated_at')
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Table not found', details: TABLE_MISSING_HINT },
          {
            status: 500,
          }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: rowToPrefs(data) })
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
