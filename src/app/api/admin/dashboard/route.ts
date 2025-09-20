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

    // Get admin dashboard data - simplified approach
    // For now, let's just get basic user count and analytics data
    const { data: allUsers, error: usersError } = await supabase
      .from('user_analytics_summary')
      .select('user_id, total_visits, total_time_spent, total_tasks_created, total_goals_created, last_visit, first_visit');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      // Don't fail completely, just use empty data
      console.log('Continuing with empty users data');
    }

    // Get analytics data
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('user_analytics_summary')
      .select('*');

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      // Don't fail, just use empty analytics
    }

    // Build dashboard data manually from analytics data
    const dashboardData = {
      total_users: allUsers?.length || 0,
      active_users_today: allUsers?.filter(a => a.last_visit && new Date(a.last_visit) >= new Date(new Date().setHours(0,0,0,0))).length || 0,
      total_tasks_created: allUsers?.reduce((sum, a) => sum + (a.total_tasks_created || 0), 0) || 0,
      total_goals_created: allUsers?.reduce((sum, a) => sum + (a.total_goals_created || 0), 0) || 0,
      total_tasks_completed: allUsers?.reduce((sum, a) => sum + (a.total_tasks_completed || 0), 0) || 0,
      total_goals_completed: allUsers?.reduce((sum, a) => sum + (a.total_goals_completed || 0), 0) || 0,
      average_session_duration: 0,
      top_active_users: allUsers?.slice(0, 5).map(a => ({
        email: `User ${a.user_id.substring(0, 8)}`, // Use user ID since we don't have email
        total_visits: a.total_visits || 0,
        total_time_spent: a.total_time_spent || 0,
        last_visit: a.last_visit,
        tasks_created: a.total_tasks_created || 0,
        goals_created: a.total_goals_created || 0
      })) || []
    };

    // Build users data manually
    const users = allUsers?.map(analytics => ({
      user_id: analytics.user_id,
      email: `User ${analytics.user_id.substring(0, 8)}`, // Use user ID since we don't have email
      created_at: analytics.first_visit,
      last_sign_in_at: analytics.last_visit,
      total_visits: analytics.total_visits || 0,
      total_time_spent: analytics.total_time_spent || 0,
      total_tasks_created: analytics.total_tasks_created || 0,
      total_goals_created: analytics.total_goals_created || 0,
      total_tasks_completed: analytics.total_tasks_completed || 0,
      total_goals_completed: analytics.total_goals_completed || 0,
      last_visit: analytics.last_visit,
      first_visit: analytics.first_visit
    })) || [];

    // Get recent activity logs
    const { data: recentActivity, error: activityError } = await supabase
      .from('user_activity_logs')
      .select(`
        id,
        user_id,
        activity_type,
        activity_data,
        page_url,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityError) {
      console.error('Error fetching recent activity:', activityError);
      // Don't fail completely, just use empty data
      console.log('Continuing with empty activity data');
    }

    return NextResponse.json({
      dashboard: dashboardData || {},
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
