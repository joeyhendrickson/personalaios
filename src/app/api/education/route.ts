import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createEducationItemSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  points_value: z.number().min(1).max(10000).default(100),
  cost: z.number().min(0).optional(),
  priority_level: z.number().min(1).max(5).default(3),
  target_date: z.string().optional(),
});

const updateEducationItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  points_value: z.number().min(1).max(10000).optional(),
  cost: z.number().min(0).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority_level: z.number().min(1).max(5).optional(),
  target_date: z.string().optional(),
  is_active: z.boolean().optional(),
});

// GET /api/education - Get all education items for the current user
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

    // Get education items
    const { data: educationItems, error: educationError } = await supabase
      .from('education_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_level', { ascending: true })
      .order('created_at', { ascending: false });

    if (educationError) {
      console.error('Error fetching education items:', educationError);
      return NextResponse.json({ 
        error: 'Failed to fetch education items',
        details: educationError.message,
        code: educationError.code
      }, { status: 500 });
    }

    console.log('Fetched education items:', educationItems?.length || 0);

    // Get completion status for each education item
    const educationItemsWithStatus = await Promise.all(
      (educationItems || []).map(async (item) => {
        const { data: completion, error: completionError } = await supabase
          .from('education_completions')
          .select('id, completed_at, points_awarded, notes')
          .eq('user_id', user.id)
          .eq('education_item_id', item.id)
          .order('completed_at', { ascending: false })
          .limit(1);

        if (completionError) {
          console.error('Error fetching education completion:', completionError);
        }

        return {
          ...item,
          is_completed: completion && completion.length > 0,
          completed_at: completion?.[0]?.completed_at || null,
          completion_notes: completion?.[0]?.notes || null
        };
      })
    );

    console.log('Returning education items with status:', educationItemsWithStatus.length);
    return NextResponse.json({ educationItems: educationItemsWithStatus }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/education - Create a new education item
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

    const body = await request.json();
    const validatedData = createEducationItemSchema.parse(body);

    const { data: educationItem, error: educationError } = await supabase
      .from('education_items')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single();

    if (educationError) {
      console.error('Error creating education item:', educationError);
      return NextResponse.json({ error: 'Failed to create education item' }, { status: 500 });
    }

    return NextResponse.json({ educationItem }, { status: 201 });
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
