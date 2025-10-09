import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured',
          details: 'Please add OPENAI_API_KEY to your environment variables',
        },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goals, stats, target_areas, body_type_goal } = body

    console.log(`Generating workout plan for user: ${user.id}`)
    console.log(
      `Goals: ${goals?.length || 0}, Stats: ${stats?.length || 0}, Target areas: ${target_areas?.join(', ') || 'none'}`
    )

    // Get available exercises from database
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .order('name')

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError)
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
    }

    // Generate workout plan using AI
    const workoutPlan = await generateWorkoutPlanWithAI(
      goals || [],
      stats || [],
      target_areas || [],
      body_type_goal,
      exercises || []
    )

    // Save workout plan to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        plan_name: workoutPlan.plan_name,
        plan_type: workoutPlan.plan_type,
        difficulty_level: workoutPlan.difficulty_level,
        duration_weeks: workoutPlan.duration_weeks,
        frequency_per_week: workoutPlan.frequency_per_week,
        target_areas: workoutPlan.target_areas,
        goals_supported: workoutPlan.goals_supported,
        description: workoutPlan.description,
        weekly_structure: workoutPlan.weekly_structure,
        progression_strategy: workoutPlan.progression_strategy,
        is_ai_generated: true,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving workout plan:', saveError)
      return NextResponse.json({ error: 'Failed to save workout plan' }, { status: 500 })
    }

    // Save workout plan exercises
    if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
      const exerciseInserts = workoutPlan.exercises.map((exercise: any) => ({
        workout_plan_id: savedPlan.id,
        exercise_id: exercise.exercise_id,
        day_of_week: exercise.day_of_week,
        week_number: exercise.week_number,
        sets: exercise.sets,
        reps: exercise.reps,
        weight_suggestion: exercise.weight_suggestion,
        rest_seconds: exercise.rest_seconds,
        order_index: exercise.order_index,
        notes: exercise.notes,
      }))

      const { error: exercisesSaveError } = await supabase
        .from('workout_plan_exercises')
        .insert(exerciseInserts)

      if (exercisesSaveError) {
        console.error('Error saving workout plan exercises:', exercisesSaveError)
        // Continue even if exercises fail to save
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'workout_plan_generated',
      description: `Generated AI workout plan: ${workoutPlan.plan_name}`,
      metadata: {
        plan_type: workoutPlan.plan_type,
        difficulty_level: workoutPlan.difficulty_level,
        duration_weeks: workoutPlan.duration_weeks,
        target_areas: workoutPlan.target_areas,
        exercise_count: workoutPlan.exercises?.length || 0,
      },
    })

    return NextResponse.json({
      success: true,
      workout_plan: savedPlan,
      exercises: workoutPlan.exercises || [],
      recommendations: workoutPlan.recommendations,
    })
  } catch (error) {
    console.error('Error generating workout plan:', error)

    // Check if it's an OpenAI API error
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          error: 'OpenAI API key not configured or invalid',
          details: 'Please check your OpenAI API key in the environment variables',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate workout plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function generateWorkoutPlanWithAI(
  goals: any[],
  stats: any[],
  targetAreas: string[],
  bodyTypeGoal: string,
  availableExercises: any[]
) {
  // Prepare data for AI
  const goalsData = goals.map((g) => ({
    type: g.goal_type,
    target_areas: g.target_areas,
    timeline_weeks: g.timeline_weeks,
    priority: g.priority_level,
    description: g.description,
  }))

  const statsData = stats.map((s) => ({
    type: s.stat_type,
    exercise: s.exercise_name,
    value: s.measurement_value,
    unit: s.measurement_unit,
    rep_range: s.rep_range,
  }))

  const exercisesData = availableExercises.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    muscle_groups: e.muscle_groups,
    equipment: e.equipment_needed,
    difficulty: e.difficulty_level,
    is_compound: e.is_compound,
  }))

  const prompt = `
Create a comprehensive, detailed weekly workout plan based on the following user data:

USER GOALS:
${JSON.stringify(goalsData, null, 2)}

CURRENT FITNESS STATS:
${JSON.stringify(statsData, null, 2)}

TARGET AREAS: ${targetAreas.join(', ')}
DESIRED BODY TYPE: ${bodyTypeGoal}

IMPORTANT: Pay special attention to the goal descriptions provided above. These contain specific details about what the user wants to achieve and should heavily influence your workout plan recommendations.

AVAILABLE EXERCISES:
${JSON.stringify(exercisesData, null, 2)}

Create a detailed workout plan that includes:
1. Plan name and type
2. Difficulty level (beginner/intermediate/advanced)
3. Duration in weeks (4-12 weeks)
4. Frequency per week (3-6 days)
5. Target areas to focus on
6. Goals this plan supports
7. Detailed description
8. Complete weekly schedule with specific exercises for each day
9. Sets, reps, weight suggestions, and rest periods
10. Progressive overload strategy
11. Recovery recommendations
12. Weekly structure breakdown

Format your response as JSON with this structure:
{
  "plan_name": "Descriptive name for the plan",
  "plan_type": "strength/cardio/hybrid/flexibility/sport_specific",
  "difficulty_level": "beginner/intermediate/advanced",
  "duration_weeks": 8,
  "frequency_per_week": 4,
  "target_areas": ["chest", "shoulders", "arms"],
  "goals_supported": ["muscle_gain", "strength"],
  "description": "Detailed description of the plan and approach",
  "weekly_structure": {
    "monday": {
      "focus": "Upper Body Strength",
      "duration_minutes": 60,
      "exercises": [
        {
          "exercise_id": "uuid",
          "exercise_name": "Push-ups",
          "sets": 3,
          "reps": "8-12",
          "weight_suggestion": null,
          "rest_seconds": 90,
          "order_index": 1,
          "notes": "Focus on form, full range of motion"
        }
      ]
    },
    "tuesday": {
      "focus": "Lower Body Strength",
      "duration_minutes": 45,
      "exercises": []
    },
    "wednesday": {
      "focus": "Rest Day",
      "duration_minutes": 0,
      "exercises": []
    },
    "thursday": {
      "focus": "Upper Body Hypertrophy",
      "duration_minutes": 60,
      "exercises": []
    },
    "friday": {
      "focus": "Lower Body Power",
      "duration_minutes": 45,
      "exercises": []
    },
    "saturday": {
      "focus": "Cardio & Core",
      "duration_minutes": 30,
      "exercises": []
    },
    "sunday": {
      "focus": "Active Recovery",
      "duration_minutes": 20,
      "exercises": []
    }
  },
  "exercises": [
    {
      "exercise_id": "uuid",
      "day_of_week": 1,
      "week_number": 1,
      "sets": 3,
      "reps": "8-12",
      "weight_suggestion": 135,
      "rest_seconds": 90,
      "order_index": 1,
      "notes": "Focus on form"
    }
  ],
  "progression_strategy": {
    "week_1_2": "Focus on form and establishing baseline",
    "week_3_4": "Increase weight by 5-10% or add 1-2 reps",
    "week_5_6": "Increase volume or intensity",
    "week_7_8": "Peak performance and deload if needed"
  },
  "recommendations": {
    "progression": "How to progress over time",
    "recovery": "Recovery and rest day recommendations",
    "nutrition": "Nutritional considerations",
    "tips": "Additional tips for success"
  }
}

IMPORTANT REQUIREMENTS:
- Create a complete weekly schedule with specific exercises for each workout day
- Include realistic durations for each workout session
- Align exercises with the user's specific goals and target areas
- Provide clear progression over the weeks
- Include both compound and isolation exercises
- Consider the user's current fitness level from their stats
- Make sure each day has a clear focus (e.g., "Upper Body Strength", "Lower Body Power", "Cardio & Core")
- Include rest days and active recovery
- Provide specific rep ranges, sets, and rest periods for each exercise
`

  const { text: aiResponse } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content:
          'You are an expert fitness trainer and workout plan creator. Create detailed, personalized workout plans based on user goals, current fitness level, and available exercises. Always prioritize safety and progressive overload.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  })

  let parsedResponse
  try {
    parsedResponse = JSON.parse(aiResponse)
  } catch (parseError) {
    // If JSON parsing fails, create a basic plan
    parsedResponse = {
      plan_name: 'Personalized Fitness Plan',
      plan_type: 'hybrid',
      difficulty_level: 'beginner',
      duration_weeks: 8,
      frequency_per_week: 3,
      target_areas: targetAreas,
      goals_supported: goals.map((g) => g.goal_type),
      description: 'A personalized workout plan based on your goals and current fitness level.',
      exercises: [],
      recommendations: {
        progression: 'Gradually increase weight or reps each week',
        recovery: 'Take at least one rest day between workout days',
        nutrition: 'Focus on protein intake and hydration',
        tips: 'Listen to your body and adjust as needed',
      },
    }
  }

  return parsedResponse
}
