import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const logActivitySchema = z.object({
  activity_type: z.enum(['login', 'task_created', 'goal_created', 'task_completed', 'goal_completed', 'page_visit', 'session_start', 'session_end']),
  activity_data: z.record(z.any()).optional(),
  page_url: z.string().optional(),
  session_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle Zod validation with better error handling
    let validatedData;
    try {
      validatedData = logActivitySchema.parse(body);
    } catch (zodError) {
      console.error('Zod validation error:', zodError);
      return NextResponse.json({ 
        error: 'Invalid input data', 
        details: zodError instanceof Error ? zodError.message : 'Unknown validation error'
      }, { status: 400 });
    }

    // Log the activity
    const { error: logError } = await supabase
      .rpc('log_user_activity', {
        p_user_id: user.id,
        p_activity_type: validatedData.activity_type,
        p_activity_data: validatedData.activity_data || null,
        p_page_url: validatedData.page_url || null,
        p_session_id: validatedData.session_id || null
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
    }

    // Update analytics summary
    const { error: analyticsError } = await supabase
      .rpc('update_user_analytics', {
        p_user_id: user.id,
        p_activity_type: validatedData.activity_type
      });

    if (analyticsError) {
      console.error('Error updating analytics:', analyticsError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Unexpected error in activity logging:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
