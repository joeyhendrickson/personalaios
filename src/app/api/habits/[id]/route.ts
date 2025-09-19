import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateHabitSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  points_per_completion: z.number().min(1).max(1000).optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/habits/[id] - Update a habit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateHabitSchema.parse(body);

    const { data: habit, error: habitError } = await supabase
      .from('daily_habits')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (habitError) {
      console.error('Error updating habit:', habitError);
      return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
    }

    return NextResponse.json({ habit }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.issues 
      }, { status: 400 });
    }
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// DELETE /api/habits/[id] - Delete a habit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: habitError } = await supabase
      .from('daily_habits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (habitError) {
      console.error('Error deleting habit:', habitError);
      return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Habit deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
