import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/business-hacks/[id] - Update a business app
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: appId } = await params
    const body = await request.json()

    const { data: businessApp, error: businessAppError } = await supabase
      .from('business_apps')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (businessAppError) {
      console.error('Error updating business app:', businessAppError)
      return NextResponse.json({ error: 'Failed to update business app' }, { status: 500 })
    }

    if (!businessApp) {
      return NextResponse.json({ error: 'Business app not found' }, { status: 404 })
    }

    return NextResponse.json({ businessApp }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/business-hacks/[id] - Delete a business app
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: appId } = await params

    const { error: deleteError } = await supabase
      .from('business_apps')
      .delete()
      .eq('id', appId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting business app:', deleteError)
      return NextResponse.json({ error: 'Failed to delete business app' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Business app deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
