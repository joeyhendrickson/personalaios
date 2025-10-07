import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/dashboard-categories/initialize - Initialize default categories for a user
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has categories
    const { data: existingCategories, error: checkError } = await supabase
      .from('dashboard_categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing categories:', checkError)
      return NextResponse.json({ error: 'Failed to check existing categories' }, { status: 500 })
    }

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json({ message: 'Categories already initialized' })
    }

    // Create default categories
    const defaultCategories = [
      {
        user_id: user.id,
        name: 'Goals',
        description: 'Measurable things I really need to achieve in my life right now',
        color: '#3B82F6',
        icon_name: 'Target',
        sort_order: 1,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'Priorities',
        description: 'AI-recommended priorities I should do now',
        color: '#10B981',
        icon_name: 'Zap',
        sort_order: 2,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'Projects',
        description: "Tracking my progress on big ideas and things I'm doing to reach my goals",
        color: '#8B5CF6',
        icon_name: 'FolderOpen',
        sort_order: 3,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'Tasks',
        description: 'Breaking down my projects into actionable items',
        color: '#F59E0B',
        icon_name: 'CheckSquare',
        sort_order: 4,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'Education',
        description: "Things I'm learning or certificates I'm completing",
        color: '#EF4444',
        icon_name: 'BookOpen',
        sort_order: 5,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'Daily Habits',
        description: 'Do these things every day and earn points',
        color: '#06B6D4',
        icon_name: 'Repeat',
        sort_order: 6,
        is_default: true,
      },
      {
        user_id: user.id,
        name: 'AI Advisor',
        description: 'Help me organize my life and get things done',
        color: '#84CC16',
        icon_name: 'Brain',
        sort_order: 7,
        is_default: true,
      },
    ]

    const { data: categories, error } = await supabase
      .from('dashboard_categories')
      .insert(defaultCategories)
      .select()

    if (error) {
      console.error('Error creating default categories:', error)
      return NextResponse.json({ error: 'Failed to create default categories' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Default categories initialized successfully',
      categories,
    })
  } catch (error) {
    console.error('Error in initialize categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
