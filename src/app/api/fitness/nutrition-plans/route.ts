import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: plans, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching nutrition plans:', error)
      return NextResponse.json({ error: 'Failed to fetch nutrition plans' }, { status: 500 })
    }

    return NextResponse.json(plans || [])
  } catch (error) {
    console.error('Error in nutrition plans GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch nutrition plans',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      plan_name,
      plan_type,
      diet_type,
      diet_modifications,
      daily_calories,
      protein_grams,
      carbs_grams,
      fat_grams,
      fiber_grams,
      water_liters,
      meal_frequency,
      description,
    } = body

    if (!plan_name || !plan_type) {
      return NextResponse.json({ error: 'Plan name and type are required' }, { status: 400 })
    }

    console.log(`Creating nutrition plan for user: ${user.id}`)
    console.log(`Plan: ${plan_name}, Type: ${plan_type}, Calories: ${daily_calories}`)

    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.id,
        plan_name,
        plan_type,
        diet_type,
        diet_modifications: diet_modifications || [],
        daily_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        fiber_grams,
        water_liters,
        meal_frequency: meal_frequency || 3,
        description,
        is_ai_generated: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating nutrition plan:', error)
      return NextResponse.json({ error: 'Failed to create nutrition plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'nutrition_plan_created',
      description: `Created nutrition plan: ${plan_name}`,
      metadata: {
        plan_type,
        daily_calories,
        meal_frequency: meal_frequency || 3,
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error in nutrition plans POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to create nutrition plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const { data: plan, error } = await supabase
      .from('nutrition_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating nutrition plan:', error)
      return NextResponse.json({ error: 'Failed to update nutrition plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'nutrition_plan_updated',
      description: `Updated nutrition plan: ${plan.plan_name}`,
      metadata: {
        plan_id: id,
        updates: Object.keys(updates),
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error in nutrition plans PUT:', error)
    return NextResponse.json(
      {
        error: 'Failed to update nutrition plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('nutrition_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting nutrition plan:', error)
      return NextResponse.json({ error: 'Failed to delete nutrition plan' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'nutrition_plan_deleted',
      description: 'Deleted nutrition plan',
      metadata: {
        plan_id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in nutrition plans DELETE:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete nutrition plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
