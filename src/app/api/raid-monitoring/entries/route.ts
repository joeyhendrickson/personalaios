import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: entries, error } = await supabase
      .from('raid_monitoring_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('priority_score', { ascending: false })

    if (error) {
      console.error('Error fetching RAID entries:', error)
      return NextResponse.json({ error: 'Failed to fetch RAID entries' }, { status: 500 })
    }

    // Parse JSON fields
    const parsedEntries = (entries || []).map((entry) => ({
      ...entry,
      sources: typeof entry.sources === 'string' ? JSON.parse(entry.sources) : entry.sources,
    }))

    return NextResponse.json({
      entries: parsedEntries,
      message: 'RAID entries fetched successfully',
    })
  } catch (error) {
    console.error('Error in entries GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entry_id, updates } = body

    if (!entry_id || !updates) {
      return NextResponse.json({ error: 'Entry ID and updates are required' }, { status: 400 })
    }

    const { data: entry, error } = await supabase
      .from('raid_monitoring_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        // version will be handled by database trigger
      })
      .eq('id', entry_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating RAID entry:', error)
      return NextResponse.json({ error: 'Failed to update RAID entry' }, { status: 500 })
    }

    if (!entry) {
      return NextResponse.json({ error: 'RAID entry not found' }, { status: 404 })
    }

    return NextResponse.json({
      entry,
      message: 'RAID entry updated successfully',
    })
  } catch (error) {
    console.error('Error in entries PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
