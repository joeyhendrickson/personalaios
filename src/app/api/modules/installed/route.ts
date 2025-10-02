import { NextRequest, NextResponse } from 'next/server'
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

    // Get installed modules for the user
    const { data: installedModules, error } = await supabase
      .from('installed_modules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_accessed', { ascending: false })

    if (error) {
      console.error('Error fetching installed modules:', error)
      return NextResponse.json({ error: 'Failed to fetch installed modules' }, { status: 500 })
    }

    return NextResponse.json({ installedModules })
  } catch (error) {
    console.error('Error in installed modules API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { moduleId, action } = await request.json()

    if (!moduleId || !action) {
      return NextResponse.json({ error: 'Module ID and action are required' }, { status: 400 })
    }

    if (action === 'install') {
      // Install module
      const { data, error } = await supabase
        .from('installed_modules')
        .upsert(
          {
            user_id: user.id,
            module_id: moduleId,
            is_active: true,
            last_accessed: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,module_id',
          }
        )
        .select()

      if (error) {
        console.error('Error installing module:', error)
        return NextResponse.json({ error: 'Failed to install module' }, { status: 500 })
      }

      return NextResponse.json({ success: true, module: data[0] })
    } else if (action === 'uninstall') {
      // Uninstall module (set is_active to false)
      const { error } = await supabase
        .from('installed_modules')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('module_id', moduleId)

      if (error) {
        console.error('Error uninstalling module:', error)
        return NextResponse.json({ error: 'Failed to uninstall module' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in module management API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
