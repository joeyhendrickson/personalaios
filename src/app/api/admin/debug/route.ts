import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  console.log('🔍 DEBUG API CALLED')

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    steps: [],
  }

  try {
    debugInfo.steps.push('✅ API endpoint reached')

    const supabase = await createClient()
    debugInfo.steps.push('✅ Supabase client created')

    // Step 1: Check session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    debugInfo.session = {
      exists: !!session,
      user_email: session?.user?.email,
      error: sessionError?.message,
    }
    debugInfo.steps.push(`✅ Session check: ${session ? 'Found' : 'None'}`)

    if (sessionError) {
      debugInfo.steps.push(`❌ Session error: ${sessionError.message}`)
      return NextResponse.json({ debugInfo })
    }

    if (!session?.user) {
      debugInfo.steps.push('❌ No user in session')
      return NextResponse.json({ debugInfo })
    }

    // Step 2: Check admin_users table
    const { data: adminUsers, error: adminError } = await supabase.from('admin_users').select('*')

    debugInfo.adminUsers = {
      count: adminUsers?.length || 0,
      data: adminUsers,
      error: adminError?.message,
    }
    debugInfo.steps.push(`✅ Admin users table: ${adminUsers?.length || 0} records`)

    // Step 3: Check if current user is admin
    const currentUserAdmin = adminUsers?.find((admin) => admin.email === session.user.email)
    debugInfo.currentUserAdmin = {
      email: session.user.email,
      isAdmin: !!currentUserAdmin,
      adminData: currentUserAdmin,
    }
    debugInfo.steps.push(`✅ Admin check: ${currentUserAdmin ? 'YES' : 'NO'}`)

    if (!currentUserAdmin) {
      debugInfo.steps.push('❌ User is not admin')
      return NextResponse.json({ debugInfo })
    }

    // Step 4: Test basic data fetching with service role
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: authUsers, error: authError } = await serviceSupabase.auth.admin.listUsers()
    debugInfo.authUsers = {
      count: authUsers?.users?.length || 0,
      error: authError?.message,
    }
    debugInfo.steps.push(`✅ Auth users: ${authUsers?.users?.length || 0} users`)

    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select('*')

    debugInfo.profiles = {
      count: profiles?.length || 0,
      error: profilesError?.message,
    }
    debugInfo.steps.push(`✅ Profiles: ${profiles?.length || 0} profiles`)

    const { data: analytics, error: analyticsError } = await serviceSupabase
      .from('user_analytics_summary')
      .select('*')

    debugInfo.analytics = {
      count: analytics?.length || 0,
      error: analyticsError?.message,
    }
    debugInfo.steps.push(`✅ Analytics: ${analytics?.length || 0} records`)

    debugInfo.steps.push('✅ All checks passed - user should have admin access')

    return NextResponse.json({
      success: true,
      debugInfo,
      message: 'Debug complete - check debugInfo for details',
    })
  } catch (error) {
    debugInfo.steps.push(
      `❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    debugInfo.error = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json({
      success: false,
      debugInfo,
      error: debugInfo.error,
    })
  }
}
