import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Chat test endpoint called');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Chat test auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Chat test user authenticated:', user.id);

    // Test basic data fetching
    const { data: goals, error: goalsError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .limit(3);

    if (goalsError) {
      console.error('Chat test goals error:', goalsError);
      return NextResponse.json({ 
        error: 'Failed to fetch goals',
        details: goalsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Chat test successful',
      user_id: user.id,
      goals_count: goals?.length || 0,
      sample_goals: goals?.slice(0, 2) || []
    });

  } catch (error) {
    console.error('Chat test error:', error);
    return NextResponse.json({
      error: 'Chat test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}