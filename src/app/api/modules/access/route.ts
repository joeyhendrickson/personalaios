import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { moduleId } = await request.json()

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
    }

    // Update last_accessed timestamp for the module
    const { error } = await supabase
      .from('installed_modules')
      .update({
        last_accessed: new Date().toISOString(),
        is_active: true, // Ensure it's marked as active when accessed
      })
      .eq('user_id', user.id)
      .eq('module_id', moduleId)

    if (error) {
      console.error('Error updating module access:', error)
      return NextResponse.json({ error: 'Failed to update module access' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in module access API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
