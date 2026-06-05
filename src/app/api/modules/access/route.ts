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

    // Atomically bump the open count (and last_accessed) so the Life Hacks list
    // can be ordered by how frequently each module is used.
    const { error: rpcError } = await supabase.rpc('increment_module_access', {
      p_module_id: moduleId,
    })

    // Fall back to a timestamp-only update when the migration adding the counter
    // and RPC hasn't been applied yet.
    if (rpcError) {
      const { error } = await supabase
        .from('installed_modules')
        .update({
          last_accessed: new Date().toISOString(),
          is_active: true,
        })
        .eq('user_id', user.id)
        .eq('module_id', moduleId)

      if (error) {
        console.error('Error updating module access:', error)
        return NextResponse.json({ error: 'Failed to update module access' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in module access API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
