import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import {
  flattenWeeklyStructureToExercises,
  normalizeDifficultyLevel,
  normalizeWeeklyStructureKeys,
  normalizeWorkoutPlanType,
  parseAiJsonResponse,
  resolveExerciseId,
  resolveWorkoutPlanWeeklyStructure,
} from '@/lib/fitness/normalize-workout-plan'

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
    const {
      goals,
      stats,
      target_areas,
      body_type_goal,
      dashboard_goals,
      latest_biometrics,
      body_photos,
    } = body

    console.log(`Generating workout plan for user: ${user.id}`)
    console.log(
      `Goals: ${goals?.length || 0}, Stats: ${stats?.length || 0}, Target areas: ${target_areas?.join(', ') || 'none'}, Dashboard goals: ${dashboard_goals?.length || 0}`
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
      exercises || [],
      dashboard_goals || [],
      latest_biometrics || null,
      body_photos || []
    )

    // Save workout plan to database
    const fullRecord = {
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
    }

    let saveRes = await supabase.from('workout_plans').insert(fullRecord).select().single()

    // weekly_structure / progression_strategy columns may not exist yet
    // (pre-migration 072) — retry without them so generation still works.
    if (saveRes.error) {
      const m = (saveRes.error.message || '').toLowerCase()
      if (
        saveRes.error.code === 'PGRST204' ||
        m.includes('weekly_structure') ||
        m.includes('progression_strategy') ||
        m.includes('column')
      ) {
        const { weekly_structure: _ws, progression_strategy: _ps, ...rest } = fullRecord
        saveRes = await supabase.from('workout_plans').insert(rest).select().single()
      }
    }

    const savedPlan = saveRes.data
    if (saveRes.error || !savedPlan) {
      console.error('Error saving workout plan:', saveRes.error)
      return NextResponse.json(
        { error: 'Failed to save workout plan', details: saveRes.error?.message },
        { status: 500 }
      )
    }

    const exerciseInserts = (workoutPlan.exercises || [])
      .map((exercise: any) => {
        const exerciseId = resolveExerciseId(
          exercise.exercise_id,
          exercise.exercise_name,
          exercises || []
        )
        if (!exerciseId || !exercise.day_of_week) return null
        return {
          workout_plan_id: savedPlan.id,
          exercise_id: exerciseId,
          day_of_week: exercise.day_of_week,
          week_number: exercise.week_number ?? 1,
          sets: exercise.sets ?? 3,
          reps: exercise.reps ?? '8-12',
          weight_suggestion: exercise.weight_suggestion ?? null,
          rest_seconds: exercise.rest_seconds ?? 60,
          order_index: exercise.order_index ?? 1,
          notes: exercise.notes,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    if (exerciseInserts.length > 0) {
      const { error: exercisesSaveError } = await supabase
        .from('workout_plan_exercises')
        .insert(exerciseInserts)

      if (exercisesSaveError) {
        console.error('Error saving workout plan exercises:', exercisesSaveError)
      }
    }

    // Persist weekly_structure if the first insert omitted JSONB columns.
    if (workoutPlan.weekly_structure && !savedPlan.weekly_structure) {
      const { data: updatedPlan } = await supabase
        .from('workout_plans')
        .update({
          weekly_structure: workoutPlan.weekly_structure,
          progression_strategy: workoutPlan.progression_strategy ?? null,
        })
        .eq('id', savedPlan.id)
        .select()
        .single()
      if (updatedPlan) {
        savedPlan.weekly_structure = updatedPlan.weekly_structure
        savedPlan.progression_strategy = updatedPlan.progression_strategy
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
      workout_plan: {
        ...savedPlan,
        weekly_structure: resolveWorkoutPlanWeeklyStructure({
          ...savedPlan,
          weekly_structure: savedPlan.weekly_structure ?? workoutPlan.weekly_structure ?? null,
          workout_plan_exercises: exerciseInserts.map((row) => ({
            day_of_week: row.day_of_week,
            sets: row.sets,
            reps: row.reps,
            weight_suggestion: row.weight_suggestion,
            rest_seconds: row.rest_seconds,
            order_index: row.order_index,
            notes: row.notes,
            exercise_id: row.exercise_id,
            exercises: {
              name:
                workoutPlan.exercises?.find(
                  (ex) => ex != null && ex.exercise_id === row.exercise_id
                )?.exercise_name ?? null,
            },
          })),
        }),
        progression_strategy:
          savedPlan.progression_strategy ?? workoutPlan.progression_strategy ?? null,
      },
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
  availableExercises: any[],
  dashboardGoals: any[] = [],
  latestBiometrics: any | null = null,
  bodyPhotos: any[] = []
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

  const dashboardGoalsSummary =
    dashboardGoals.length > 0
      ? JSON.stringify(
          dashboardGoals.slice(0, 15).map((g: any) => ({
            title: g.title,
            description: g.description,
            priority: g.priority_level,
            target_date: g.target_date,
          })),
          null,
          2
        )
      : 'None provided'

  const bodyAnalysisSummary =
    bodyPhotos && bodyPhotos.length > 0
      ? bodyPhotos
          .slice(0, 3)
          .map((p: any, i: number) => {
            const a = p?.analysis_data
            const text = a?.analysis_text ? `\nAI assessment: ${a.analysis_text}` : ''
            return `Photo ${i + 1} (${p?.photo_type || 'photo'}): target areas ${
              (p?.target_areas || []).join(', ') || 'n/a'
            }; desired body type ${p?.body_type_goal || 'n/a'}${text}`
          })
          .join('\n\n')
      : 'No body photos provided.'

  const biometricsSummary = latestBiometrics
    ? `Latest biometrics snapshot (use to bias recovery and session intensity, not medical advice):
Sleep (hours): ${latestBiometrics.sleep_hours ?? 'n/a'}
Blood pressure: ${latestBiometrics.blood_pressure_systolic ?? '—'}/${latestBiometrics.blood_pressure_diastolic ?? '—'}
Resting heart rate: ${latestBiometrics.resting_heart_rate ?? 'n/a'}
Stress (1-10): ${latestBiometrics.stress_level_1_10 ?? 'n/a'}
Self-reported energy (1-10): ${latestBiometrics.energy_level_self_1_10 ?? 'n/a'}
Contextual energy estimate (1-10): ${latestBiometrics.contextual_energy_level_1_10 ?? 'n/a'}
`
    : 'No recent biometrics logged — assume moderate recovery unless stats suggest otherwise.'

  const prompt = `
Create a comprehensive, detailed weekly workout plan based on the following user data:

FITNESS MODULE GOALS:
${JSON.stringify(goalsData, null, 2)}

DASHBOARD GOALS (user's primary Life Stacks goals — align volume and exercise selection where sensible):
${dashboardGoalsSummary}

CURRENT FITNESS STATS:
${JSON.stringify(statsData, null, 2)}

BIOMETRICS / RECOVERY CONTEXT:
${biometricsSummary}

BODY ANALYSIS (from uploaded photos and AI assessment — use to prioritize muscle groups and target areas):
${bodyAnalysisSummary}

TARGET AREAS: ${targetAreas.join(', ')}
DESIRED BODY TYPE: ${bodyTypeGoal}

IMPORTANT: Pay special attention to the goal descriptions provided above. These contain specific details about what the user wants to achieve and should heavily influence your workout plan recommendations.
When contextual energy is low, prefer shorter sessions, fewer hard sets, and more built-in recovery while still progressing toward dashboard goals.
When energy is high and stress moderate, you may include slightly more volume or conditioning aligned with their goals.

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
    model: defaultOpenaiModel(),
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

  let parsedResponse: Record<string, unknown>
  try {
    parsedResponse = parseAiJsonResponse(aiResponse) as Record<string, unknown>
  } catch {
    throw new Error('AI returned invalid JSON for the workout plan')
  }

  const weeklyStructure = normalizeWeeklyStructureKeys(parsedResponse.weekly_structure)
  const normalizedExercises =
    Array.isArray(parsedResponse.exercises) && parsedResponse.exercises.length > 0
      ? (parsedResponse.exercises as Array<Record<string, unknown>>)
          .map((exercise, index) => {
            const exerciseId = resolveExerciseId(
              typeof exercise.exercise_id === 'string' ? exercise.exercise_id : null,
              typeof exercise.exercise_name === 'string'
                ? exercise.exercise_name
                : typeof exercise.name === 'string'
                  ? exercise.name
                  : null,
              availableExercises
            )
            if (!exerciseId || typeof exercise.day_of_week !== 'number') return null
            return {
              exercise_id: exerciseId,
              exercise_name:
                typeof exercise.exercise_name === 'string'
                  ? exercise.exercise_name
                  : typeof exercise.name === 'string'
                    ? exercise.name
                    : availableExercises.find((e) => e.id === exerciseId)?.name || 'Exercise',
              day_of_week: exercise.day_of_week,
              week_number: typeof exercise.week_number === 'number' ? exercise.week_number : 1,
              sets: typeof exercise.sets === 'number' ? exercise.sets : 3,
              reps: typeof exercise.reps === 'string' ? exercise.reps : '8-12',
              weight_suggestion:
                typeof exercise.weight_suggestion === 'number' ? exercise.weight_suggestion : null,
              rest_seconds: typeof exercise.rest_seconds === 'number' ? exercise.rest_seconds : 60,
              order_index:
                typeof exercise.order_index === 'number' ? exercise.order_index : index + 1,
              notes: typeof exercise.notes === 'string' ? exercise.notes : undefined,
            }
          })
          .filter((ex): ex is NonNullable<typeof ex> => ex != null)
      : flattenWeeklyStructureToExercises(weeklyStructure, availableExercises).map((row) => ({
          ...row,
          exercise_name:
            availableExercises.find((e) => e.id === row.exercise_id)?.name || 'Exercise',
        }))

  return {
    plan_name:
      typeof parsedResponse.plan_name === 'string'
        ? parsedResponse.plan_name
        : 'Personalized Fitness Plan',
    plan_type: normalizeWorkoutPlanType(parsedResponse.plan_type),
    difficulty_level: normalizeDifficultyLevel(parsedResponse.difficulty_level),
    duration_weeks:
      typeof parsedResponse.duration_weeks === 'number'
        ? Math.min(16, Math.max(4, parsedResponse.duration_weeks))
        : 8,
    frequency_per_week:
      typeof parsedResponse.frequency_per_week === 'number'
        ? Math.min(6, Math.max(3, parsedResponse.frequency_per_week))
        : 4,
    target_areas: Array.isArray(parsedResponse.target_areas)
      ? parsedResponse.target_areas
      : targetAreas,
    goals_supported: Array.isArray(parsedResponse.goals_supported)
      ? parsedResponse.goals_supported
      : goals.map((g) => g.goal_type),
    description:
      typeof parsedResponse.description === 'string'
        ? parsedResponse.description
        : 'A personalized workout plan based on your goals and current fitness level.',
    weekly_structure: weeklyStructure,
    progression_strategy:
      parsedResponse.progression_strategy &&
      typeof parsedResponse.progression_strategy === 'object' &&
      !Array.isArray(parsedResponse.progression_strategy)
        ? (parsedResponse.progression_strategy as Record<string, string>)
        : undefined,
    exercises: normalizedExercises,
    recommendations:
      parsedResponse.recommendations &&
      typeof parsedResponse.recommendations === 'object' &&
      !Array.isArray(parsedResponse.recommendations)
        ? parsedResponse.recommendations
        : {
            progression: 'Gradually increase weight or reps each week',
            recovery: 'Take at least one rest day between workout days',
            nutrition: 'Focus on protein intake and hydration',
            tips: 'Listen to your body and adjust as needed',
          },
  }
}
