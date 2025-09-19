import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
});

// PATCH /api/projects/[id]/progress - Update project progress
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

    const { id: projectId } = await params;
    const body = await request.json();
    const { progress } = updateProgressSchema.parse(body);

    // Get the current project
    const { data: project, error: projectError } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Calculate new current_points based on progress percentage
    const newCurrentPoints = Math.round((progress / 100) * project.target_points);
    const pointsEarned = newCurrentPoints - (project.current_points || 0);

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('weekly_goals')
      .update({ 
        current_points: newCurrentPoints 
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project progress:', updateError);
      return NextResponse.json({ error: 'Failed to update project progress' }, { status: 500 });
    }

    // Add points change to the ledger (positive or negative)
    if (pointsEarned !== 0) {
      const description = pointsEarned > 0 
        ? `Progress on "${project.title}"` 
        : `Progress reduced on "${project.title}"`
      
      const { error: pointsError } = await supabase
        .from('points_ledger')
        .insert({
          user_id: user.id,
          weekly_goal_id: projectId,
          points: pointsEarned, // This can be negative
          description: description,
          created_at: new Date().toISOString()
        })

      if (pointsError) {
        console.error('Error adding points to ledger:', pointsError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      project: updatedProject,
      pointsEarned,
      message: pointsEarned > 0 
        ? `Earned ${pointsEarned} points!` 
        : pointsEarned < 0 
        ? `Lost ${Math.abs(pointsEarned)} points.`
        : 'No points change.'
    }, { status: 200 });
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

