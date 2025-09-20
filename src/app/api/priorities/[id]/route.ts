import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updatePrioritySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority_type: z.enum(['ai_recommended', 'manual', 'fire_auto']).optional(),
  priority_score: z.number().min(0).max(100).optional(),
  manual_order: z.number().int().optional(),
  is_completed: z.boolean().optional(),
});

// PATCH /api/priorities/[id] - Update a specific priority
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: priorityId } = await params;
    const body = await request.json();
    const validatedData = updatePrioritySchema.parse(body);

    // Verify the priority exists and belongs to the user
    const { data: existingPriority, error: fetchError } = await supabase
      .from('priorities')
      .select('id')
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingPriority) {
      return NextResponse.json({ error: 'Priority not found or access denied' }, { status: 404 });
    }

    // If marking as completed, set completed_at timestamp
    const updateData = { ...validatedData };
    if (validatedData.is_completed === true) {
      updateData.completed_at = new Date().toISOString();
    } else if (validatedData.is_completed === false) {
      updateData.completed_at = null;
    }

    const { data: priority, error: updateError } = await supabase
      .from('priorities')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating priority:', updateError);
      return NextResponse.json({ error: 'Failed to update priority' }, { status: 500 });
    }

    return NextResponse.json({ priority }, { status: 200 });
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

// DELETE /api/priorities/[id] - Delete a specific priority
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: priorityId } = await params;

    // Verify the priority exists and belongs to the user
    const { data: existingPriority, error: fetchError } = await supabase
      .from('priorities')
      .select('id')
      .eq('id', priorityId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingPriority) {
      return NextResponse.json({ error: 'Priority not found or access denied' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('priorities')
      .delete()
      .eq('id', priorityId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting priority:', deleteError);
      return NextResponse.json({ error: 'Failed to delete priority' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Priority deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

