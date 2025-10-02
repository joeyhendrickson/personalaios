import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: relationshipTypes, error } = await supabase
      .from('relationship_types')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching relationship types:', error)
      return NextResponse.json({ error: 'Failed to fetch relationship types' }, { status: 500 })
    }

    return NextResponse.json({ relationshipTypes })
  } catch (error) {
    console.error('Error in relationship types API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
