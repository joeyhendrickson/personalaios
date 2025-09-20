import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin dashboard data
    const { data: dashboardData, error: dashboardError } = await supabase
      .rpc('get_admin_dashboard_data');

    if (dashboardError) {
      console.error('Error fetching admin dashboard data:', dashboardError);
      return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }

    // Get detailed user list with analytics using the new function
    const { data: users, error: usersError } = await supabase
      .rpc('get_all_users_with_analytics');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get recent activity logs
    const { data: recentActivity, error: activityError } = await supabase
      .from('user_activity_logs')
      .select(`
        id,
        user_id,
        activity_type,
        activity_data,
        page_url,
        created_at,
        auth.users!inner(email)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      console.error('Error fetching recent activity:', activityError);
      return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 });
    }

    return NextResponse.json({
      dashboard: dashboardData[0] || {},
      users: users || [],
      recentActivity: recentActivity || [],
      adminUser: {
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Unexpected error in admin dashboard:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
