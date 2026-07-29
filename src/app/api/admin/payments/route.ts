import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/workshop/registration'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .single()

    if (adminError || !adminUser || !adminUser.is_active) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const serviceSupabase = createSupabaseServiceClient()
    const { data: payments, error: paymentsError } = await serviceSupabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    const stats = {
      total: payments?.length || 0,
      totalRevenue: payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
      basicPlanCount: payments?.filter((p) => p.plan_type === 'basic').length || 0,
      premiumPlanCount: payments?.filter((p) => p.plan_type === 'premium').length || 0,
      workshopCount: payments?.filter((p) => p.plan_type === 'workshop').length || 0,
      workshopRevenue:
        payments
          ?.filter((p) => p.plan_type === 'workshop')
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
      thisMonth:
        payments?.filter((p) => {
          const paymentDate = new Date(p.created_at)
          const now = new Date()
          return (
            paymentDate.getMonth() === now.getMonth() &&
            paymentDate.getFullYear() === now.getFullYear()
          )
        }).length || 0,
      thisMonthRevenue:
        payments
          ?.filter((p) => {
            const paymentDate = new Date(p.created_at)
            const now = new Date()
            return (
              paymentDate.getMonth() === now.getMonth() &&
              paymentDate.getFullYear() === now.getFullYear()
            )
          })
          .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
    }

    return NextResponse.json({
      success: true,
      payments,
      stats,
    })
  } catch (error) {
    console.error('Admin payments fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
