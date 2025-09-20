import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple validation without Zod
const validActivityTypes = ['login', 'task_created', 'goal_created', 'task_completed', 'goal_completed', 'page_visit', 'session_start', 'session_end'];

function validateActivityData(body: any) {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }
  
  if (!body.activity_type || !validActivityTypes.includes(body.activity_type)) {
    throw new Error('Invalid activity_type');
  }
  
  return {
    activity_type: body.activity_type,
    activity_data: body.activity_data || null,
    page_url: body.page_url || null,
    session_id: body.session_id || null
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request data
    let validatedData;
    try {
      validatedData = validateActivityData(body);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: validationError instanceof Error ? validationError.message : 'Unknown validation error'
      }, { status: 400 });
    }

    // Log the activity directly to the table
    const { error: logError } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: user.id,
        activity_type: validatedData.activity_type,
        activity_data: validatedData.activity_data,
        page_url: validatedData.page_url,
        session_id: validatedData.session_id
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
    }

    // Update analytics summary directly
    const { error: analyticsError } = await supabase
      .from('user_analytics_summary')
      .upsert({
        user_id: user.id,
        total_visits: validatedData.activity_type === 'page_visit' ? 1 : 0,
        total_tasks_created: validatedData.activity_type === 'task_created' ? 1 : 0,
        total_goals_created: validatedData.activity_type === 'goal_created' ? 1 : 0,
        total_tasks_completed: validatedData.activity_type === 'task_completed' ? 1 : 0,
        total_goals_completed: validatedData.activity_type === 'goal_completed' ? 1 : 0,
        last_visit: validatedData.activity_type === 'page_visit' ? new Date().toISOString() : null,
        first_visit: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      });

    if (analyticsError) {
      console.error('Error updating analytics:', analyticsError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error in activity logging:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
