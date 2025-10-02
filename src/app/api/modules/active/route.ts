import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    // Get active modules for the user
    const { data: activeModules, error } = await supabase
      .from('installed_modules')
      .select('module_id, last_accessed')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_accessed', { ascending: false })

    if (error) {
      console.error('Error fetching active modules:', error)
      return NextResponse.json({ error: 'Failed to fetch active modules' }, { status: 500 })
    }

    // Return just the module IDs for AI analysis
    const moduleIds = activeModules?.map((module) => module.module_id) || []

    return NextResponse.json({ activeModules: moduleIds })
  } catch (error) {
    console.error('Error in active modules API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
