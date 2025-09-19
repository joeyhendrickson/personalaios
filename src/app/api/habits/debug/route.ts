import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/habits/debug - Debug habits data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Debug: User ID:', user.id);

    // Check if habits exist at all
    const { data: allHabits, error: allHabitsError } = await supabase
      .from('daily_habits')
      .select('*');

    console.log('Debug: All habits in database:', allHabits?.length || 0);
    if (allHabitsError) {
      console.error('Debug: Error fetching all habits:', allHabitsError);
    }

    // Check user's habits
    const { data: userHabits, error: userHabitsError } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', user.id);

    console.log('Debug: User habits:', userHabits?.length || 0);
    if (userHabitsError) {
      console.error('Debug: Error fetching user habits:', userHabitsError);
    }

    return NextResponse.json({ 
      user_id: user.id,
      all_habits_count: allHabits?.length || 0,
      user_habits_count: userHabits?.length || 0,
      user_habits: userHabits || [],
      all_habits_error: allHabitsError?.message,
      user_habits_error: userHabitsError?.message
    }, { status: 200 });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
