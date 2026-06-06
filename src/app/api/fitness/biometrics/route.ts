import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'
import { normalizeBiometricRow } from '@/lib/fitness/normalize-biometrics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('fitness_biometrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(90)

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error: 'Biometrics table not found',
            details: 'Run migration 054_fitness_biometrics.sql',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        biometrics: (data || []).map((row) =>
          normalizeBiometricRow(row as Record<string, unknown>)
        ),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch biometrics' },
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
    const sleep_hours =
      body.sleep_hours !== undefined && body.sleep_hours !== '' ? Number(body.sleep_hours) : null
    const blood_pressure_systolic =
      body.blood_pressure_systolic !== undefined && body.blood_pressure_systolic !== ''
        ? parseInt(String(body.blood_pressure_systolic), 10)
        : null
    const blood_pressure_diastolic =
      body.blood_pressure_diastolic !== undefined && body.blood_pressure_diastolic !== ''
        ? parseInt(String(body.blood_pressure_diastolic), 10)
        : null
    const resting_heart_rate =
      body.resting_heart_rate !== undefined && body.resting_heart_rate !== ''
        ? parseInt(String(body.resting_heart_rate), 10)
        : null
    const stress_level_1_10 =
      body.stress_level_1_10 !== undefined && body.stress_level_1_10 !== ''
        ? clamp(body.stress_level_1_10)
        : null
    const energy_level_self_1_10 =
      body.energy_level_self_1_10 !== undefined && body.energy_level_self_1_10 !== ''
        ? clamp(body.energy_level_self_1_10)
        : null
    const iphone_summary_image_url =
      typeof body.iphone_summary_image_url === 'string' ? body.iphone_summary_image_url : null
    const fitbit_opt_in = Boolean(body.fitbit_opt_in)
    const notes = typeof body.notes === 'string' ? body.notes : null

    const { contextual_energy_level_1_10 } = computeContextualEnergyLevel({
      sleep_hours,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      resting_heart_rate,
      stress_level_1_10,
      energy_level_self_1_10,
    })

    const { data, error } = await supabase
      .from('fitness_biometrics')
      .insert({
        user_id: user.id,
        recorded_at: body.recorded_at || new Date().toISOString(),
        sleep_hours,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        resting_heart_rate,
        stress_level_1_10,
        energy_level_self_1_10,
        contextual_energy_level_1_10,
        iphone_summary_image_url,
        fitbit_opt_in,
        notes,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'fitness_biometrics_logged',
      description: 'Logged fitness biometrics',
      metadata: { contextual_energy: contextual_energy_level_1_10 },
    })

    return NextResponse.json({ biometric: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save biometrics' },
      { status: 500 }
    )
  }
}

function clamp(n: unknown): number | null {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10)
  if (Number.isNaN(x)) return null
  return Math.max(1, Math.min(10, x))
}
