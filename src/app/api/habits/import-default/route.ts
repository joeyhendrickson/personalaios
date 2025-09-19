import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/habits/import-default - Import default habits for the current user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Importing default habits for user:', user.id);

    // Check if user already has habits
    const { data: existingHabits, error: checkError } = await supabase
      .from('daily_habits')
      .select('id')
      .eq('user_id', user.id);

    if (checkError) {
      console.error('Error checking existing habits:', checkError);
      return NextResponse.json({ 
        error: 'Failed to check existing habits',
        details: checkError.message,
        code: checkError.code
      }, { status: 500 });
    }

    if (existingHabits && existingHabits.length > 0) {
      return NextResponse.json({ 
        message: 'User already has habits. Skipping import.',
        existing_count: existingHabits.length
      }, { status: 200 });
    }

    // Default habits to import
    const defaultHabits = [
      {
        title: 'DuoLingo Daily for 1 Week',
        description: 'Complete daily DuoLingo lessons for language learning',
        points_per_completion: 50
      },
      {
        title: 'No Drama - Avoid Judging',
        description: 'Get better at not judging and each day without conflict',
        points_per_completion: 50
      },
      {
        title: 'Sobriety',
        description: 'Maintain sobriety daily',
        points_per_completion: 50
      },
      {
        title: 'Stock Market Net Positive',
        description: 'Achieve net positive $500 per week in stock market',
        points_per_completion: 25
      },
      {
        title: 'Gym Workout',
        description: 'Workout at Smart Fit or Apartment Gym',
        points_per_completion: 75
      },
      {
        title: 'Job Applications',
        description: 'Submit 2 job applications each day',
        points_per_completion: 50
      },
      {
        title: 'Grocery Shopping and Saving Money',
        description: 'Shop for groceries while saving money',
        points_per_completion: 50
      },
      {
        title: 'Cook Meals',
        description: 'Cook at least 2 meals',
        points_per_completion: 50
      },
      {
        title: 'Sleep Before Midnight',
        description: 'Go to bed before midnight',
        points_per_completion: 25
      }
    ];

    // Insert all default habits
    const habitsToInsert = defaultHabits.map(habit => ({
      user_id: user.id,
      ...habit,
      is_active: true
    }));

    const { data: insertedHabits, error: insertError } = await supabase
      .from('daily_habits')
      .insert(habitsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting default habits:', insertError);
      return NextResponse.json({ 
        error: 'Failed to insert default habits',
        details: insertError.message,
        code: insertError.code
      }, { status: 500 });
    }

    console.log(`Successfully imported ${insertedHabits?.length || 0} default habits`);

    return NextResponse.json({ 
      message: `Successfully imported ${insertedHabits?.length || 0} default habits`,
      habits: insertedHabits
    }, { status: 201 });

  } catch (error) {
    console.error('Error importing default habits:', error);
    return NextResponse.json({ 
      error: 'Failed to import default habits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
