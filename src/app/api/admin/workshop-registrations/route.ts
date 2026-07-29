import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/workshop/registration'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', user.email)
    .single()

  if (adminError || !adminUser || !adminUser.is_active) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    }
  }

  return { adminUser }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const serviceSupabase = createSupabaseServiceClient()
    const { data: registrations, error } = await serviceSupabase
      .from('workshop_registrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching workshop registrations:', error)
      return NextResponse.json({ error: 'Failed to fetch workshop registrations' }, { status: 500 })
    }

    const now = new Date()
    const stats = {
      total: registrations?.length || 0,
      totalRevenue:
        registrations?.reduce((sum, row) => sum + parseFloat(String(row.amount || 0)), 0) || 0,
      onSiteStayCount: registrations?.filter((row) => row.on_site_stay).length || 0,
      idVerifiedCount: registrations?.filter((row) => row.id_verified).length || 0,
      idPendingCount:
        registrations?.filter((row) => !row.id_verified && row.registration_status !== 'cancelled')
          .length || 0,
      thisMonth:
        registrations?.filter((row) => {
          const created = new Date(row.created_at)
          return (
            created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
          )
        }).length || 0,
      thisMonthRevenue:
        registrations
          ?.filter((row) => {
            const created = new Date(row.created_at)
            return (
              created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
            )
          })
          .reduce((sum, row) => sum + parseFloat(String(row.amount || 0)), 0) || 0,
    }

    return NextResponse.json({
      success: true,
      registrations: registrations || [],
      stats,
    })
  } catch (error) {
    console.error('Admin workshop registrations fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { id, id_verified, registration_status } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'Registration id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof id_verified === 'boolean') {
      updates.id_verified = id_verified
      if (id_verified) {
        updates.registration_status = 'confirmed'
      }
    }

    if (registration_status) {
      updates.registration_status = registration_status
    }

    const serviceSupabase = createSupabaseServiceClient()
    const { data, error } = await serviceSupabase
      .from('workshop_registrations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating workshop registration:', error)
      return NextResponse.json({ error: 'Failed to update workshop registration' }, { status: 500 })
    }

    return NextResponse.json({ success: true, registration: data })
  } catch (error) {
    console.error('Admin workshop registration update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
