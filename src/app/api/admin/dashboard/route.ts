import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Try to get user from session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { session: session?.user?.email, sessionError });
    
    let user = session?.user;
    
    // If no session, try getUser
    if (!user) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('Auth user check:', { user: authUser?.email, authError });
      user = authUser;
    }
    
    if (!user) {
      console.log('No user found in session or auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User found:', user.email);

    // Check if user is admin - simplified check
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single();

    console.log('Admin check:', { adminUser, adminError, userEmail: user.email });

    if (adminError || !adminUser) {
      console.log('Admin access denied:', adminError);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get admin dashboard data - simplified without joins first
    const { data: allUsers, error: usersError } = await supabase
      .from('user_analytics_summary')
      .select(`
        user_id, 
        total_visits, 
        total_time_spent, 
        total_tasks_created, 
        total_goals_created, 
        total_tasks_completed,
        total_goals_completed,
        last_visit, 
        first_visit
      `);

    // Get points data for all users
    const { data: pointsData, error: pointsError } = await supabase
      .from('points_ledger')
      .select('user_id, points, created_at')
      .order('created_at', { ascending: false });

    if (pointsError) {
      console.error('Error fetching points data:', pointsError);
    }

    // Get user emails from a simple query instead of admin API
    const { data: authUsers, error: authUsersError } = await supabase
      .from('auth.users')
      .select('id, email, created_at');
    console.log('Auth users fetch:', { authUsers: authUsers?.length, authUsersError });

    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError);
    }

    console.log('Users data:', { allUsers: allUsers?.length, usersError });
    console.log('Points data:', { pointsData: pointsData?.length, pointsError });
    console.log('Sample user analytics:', allUsers?.[0]);
    console.log('Sample points:', pointsData?.slice(0, 3));
    
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

    // Calculate points for each user
    const userPointsMap = new Map();
    if (pointsData) {
      pointsData.forEach(point => {
        if (!userPointsMap.has(point.user_id)) {
          userPointsMap.set(point.user_id, {
            total_points: 0,
            today_points: 0,
            weekly_points: 0
          });
        }
        const userPoints = userPointsMap.get(point.user_id);
        userPoints.total_points += point.points || 0;
        
        // Calculate today's points (last 24 hours)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (new Date(point.created_at) >= yesterday) {
          userPoints.today_points += point.points || 0;
        }
        
        // Calculate weekly points (last 7 days)
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (new Date(point.created_at) >= weekAgo) {
          userPoints.weekly_points += point.points || 0;
        }
      });
    }

    // Create email lookup map
    const emailMap = new Map();
    if (authUsers) {
      authUsers.forEach(authUser => {
        emailMap.set(authUser.id, authUser.email);
      });
    }

    // Build dashboard data manually from analytics data
    const dashboardData = {
      total_users: allUsers?.length || 0,
      active_users_today: allUsers?.filter(a => a.last_visit && new Date(a.last_visit) >= new Date(new Date().setHours(0,0,0,0))).length || 0,
      total_tasks_created: allUsers?.reduce((sum, a) => sum + (a.total_tasks_created || 0), 0) || 0,
      total_goals_created: allUsers?.reduce((sum, a) => sum + (a.total_goals_created || 0), 0) || 0,
      total_tasks_completed: allUsers?.reduce((sum, a) => sum + (a.total_tasks_completed || 0), 0) || 0,
      total_goals_completed: allUsers?.reduce((sum, a) => sum + (a.total_goals_completed || 0), 0) || 0,
      total_points_earned: Array.from(userPointsMap.values()).reduce((sum, p) => sum + p.total_points, 0),
      total_points_today: Array.from(userPointsMap.values()).reduce((sum, p) => sum + p.today_points, 0),
      average_session_duration: 0,
      top_active_users: allUsers?.slice(0, 5).map(a => {
        const userPoints = userPointsMap.get(a.user_id) || { total_points: 0, today_points: 0, weekly_points: 0 };
        return {
          email: emailMap.get(a.user_id) || `User ${a.user_id.substring(0, 8)}`,
          total_visits: a.total_visits || 0,
          total_time_spent: a.total_time_spent || 0,
          last_visit: a.last_visit,
          total_points: userPoints.total_points,
          today_points: userPoints.today_points,
          weekly_points: userPoints.weekly_points
        };
      }) || []
    };

    // Build users data manually
    const users = allUsers?.map(analytics => {
      const userPoints = userPointsMap.get(analytics.user_id) || { total_points: 0, today_points: 0, weekly_points: 0 };
      return {
        user_id: analytics.user_id,
        email: emailMap.get(analytics.user_id) || `User ${analytics.user_id.substring(0, 8)}`,
        created_at: analytics.first_visit,
        last_sign_in_at: analytics.last_visit,
        total_visits: analytics.total_visits || 0,
        total_time_spent: analytics.total_time_spent || 0,
        total_tasks_created: analytics.total_tasks_created || 0,
        total_goals_created: analytics.total_goals_created || 0,
        total_tasks_completed: analytics.total_tasks_completed || 0,
        total_goals_completed: analytics.total_goals_completed || 0,
        total_points: userPoints.total_points,
        today_points: userPoints.today_points,
        weekly_points: userPoints.weekly_points,
        last_visit: analytics.last_visit,
        first_visit: analytics.first_visit
      };
    }) || [];

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

    console.log('Activity data:', { recentActivity: recentActivity?.length, activityError });
    
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
