import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const fireId = resolvedParams.id

    // Update fire status to acknowledged
    const { data: fire, error: fireError } = await supabase
      .from('raid_monitoring_fires')
      .update({
        status: 'Acknowledged',
      })
      .eq('id', fireId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (fireError) {
      console.error('Error acknowledging fire:', fireError)
      return NextResponse.json({ error: 'Failed to acknowledge fire' }, { status: 500 })
    }

    if (!fire) {
      return NextResponse.json({ error: 'Fire event not found' }, { status: 404 })
    }

    // Also update the associated RAID entry's fire status
    const { error: raidError } = await supabase
      .from('raid_monitoring_entries')
      .update({
        fire_status: 'Acknowledged',
        updated_at: new Date().toISOString(),
      })
      .eq('id', fire.raid_id)
      .eq('user_id', user.id)

    if (raidError) {
      console.error('Error updating RAID entry fire status:', raidError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      message: 'Fire acknowledged successfully',
      fire,
    })
  } catch (error) {
    console.error('Error acknowledging fire:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
