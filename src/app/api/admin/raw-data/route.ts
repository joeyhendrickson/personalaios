import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🚀 RAW DATA API CALLED - FETCHING ALL TABLE DATA');
  try {
    const supabase = await createClient();
    
    // Check admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('email', user.email)
      .single();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Admin verified, fetching all table data...');

    // Test a simple query first
    const { data: testData, error: testError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);
    
    console.log('Test query result:', { testData, testError });

    // Fetch all table data
    const [
      { data: tasks, error: tasksError },
      { data: goals, error: goalsError },
      { data: points, error: pointsError },
      { data: activities, error: activitiesError },
      { data: priorities, error: prioritiesError },
      { data: habits, error: habitsError },
      { data: education, error: educationError },
      { data: weeks, error: weeksError },
      { data: adminUsers, error: adminUsersError },
      { data: analytics, error: analyticsError }
    ] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('points_ledger').select('*'),
      supabase.from('user_activity_logs').select('*'),
      supabase.from('priorities').select('*'),
      supabase.from('daily_habits').select('*'),
      supabase.from('education_items').select('*'),
      supabase.from('weeks').select('*'),
      supabase.from('admin_users').select('*'),
      supabase.from('user_analytics_summary').select('*')
    ]);

    console.log('Raw data fetched:', {
      tasks: tasks?.length || 0,
      goals: goals?.length || 0,
      points: points?.length || 0,
      activities: activities?.length || 0,
      priorities: priorities?.length || 0,
      habits: habits?.length || 0,
      education: education?.length || 0,
      weeks: weeks?.length || 0,
      adminUsers: adminUsers?.length || 0,
      analytics: analytics?.length || 0
    });

    // Log any errors with detailed information
    if (tasksError) console.error('Tasks error:', { error: tasksError, data: tasks });
    if (goalsError) console.error('Goals error:', { error: goalsError, data: goals });
    if (pointsError) console.error('Points error:', { error: pointsError, data: points });
    if (activitiesError) console.error('Activities error:', { error: activitiesError, data: activities });
    if (prioritiesError) console.error('Priorities error:', { error: prioritiesError, data: priorities });
    if (habitsError) console.error('Habits error:', { error: habitsError, data: habits });
    if (educationError) console.error('Education error:', { error: educationError, data: education });
    if (weeksError) console.error('Weeks error:', { error: weeksError, data: weeks });
    if (adminUsersError) console.error('Admin users error:', { error: adminUsersError, data: adminUsers });
    if (analyticsError) console.error('Analytics error:', { error: analyticsError, data: analytics });

    return NextResponse.json({
      success: true,
      data: {
        tasks: tasks || [],
        goals: goals || [],
        points: points || [],
        activities: activities || [],
        priorities: priorities || [],
        habits: habits || [],
        education: education || [],
        weeks: weeks || [],
        adminUsers: adminUsers || [],
        analytics: analytics || []
      },
      counts: {
        tasks: tasks?.length || 0,
        goals: goals?.length || 0,
        points: points?.length || 0,
        activities: activities?.length || 0,
        priorities: priorities?.length || 0,
        habits: habits?.length || 0,
        education: education?.length || 0,
        weeks: weeks?.length || 0,
        adminUsers: adminUsers?.length || 0,
        analytics: analytics?.length || 0
      }
    });

  } catch (error) {
    console.error('Unexpected error in raw data API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
