import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

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
    const { habitId } = body

    // Get user's habits and completions
    const { data: habits } = await supabase
      .from('habit_master_habits')
      .select(
        `
        *,
        category:habit_categories(name),
        completions:habit_master_completions(*),
        streaks:habit_master_streaks(*)
      `
      )
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!habits || habits.length === 0) {
      return NextResponse.json({ error: 'No habits found' }, { status: 404 })
    }

    // Get specific habit if provided
    const targetHabit = habitId
      ? habits.find((h) => h.id === habitId)
      : habits[Math.floor(Math.random() * habits.length)]

    if (!targetHabit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // Prepare data for AI analysis
    const habitData = {
      habit: targetHabit,
      completions: targetHabit.completions || [],
      streak: targetHabit.streaks?.[0],
      allHabits: habits,
    }

    // Generate AI insights using psychological frameworks
    const { text: insights } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt: `You are a behavioral psychologist and habit formation expert. Analyze the following habit data and provide insights based on psychological frameworks like CBT, Self-Determination Theory, Atomic Habits, and ACT.

Habit Data:
- Title: ${targetHabit.title}
- Description: ${targetHabit.description}
- Type: ${targetHabit.habit_type}
- Category: ${targetHabit.category?.name}
- Stage of Change: ${targetHabit.stage_of_change}
- Difficulty: ${targetHabit.difficulty_level}
- Is Keystone: ${targetHabit.is_keystone}

Psychological Framework Data:
- Cue: ${targetHabit.cue_description}
- Craving: ${targetHabit.craving_description}
- Response: ${targetHabit.response_description}
- Reward: ${targetHabit.reward_description}
- If-Then Plan: ${targetHabit.if_then_plan}
- Personal Value: ${targetHabit.personal_value}
- Automatic Thought: ${targetHabit.automatic_thought}
- Cognitive Distortion: ${targetHabit.cognitive_distortion}
- Reframe Statement: ${targetHabit.reframe_statement}

SDT Scores:
- Autonomy: ${targetHabit.autonomy_score}/10
- Competence: ${targetHabit.competence_score}/10
- Relatedness: ${targetHabit.relatedness_score}/10

Completion Data:
- Total Completions: ${habitData.completions.length}
- Current Streak: ${habitData.streak?.current_streak || 0}
- Longest Streak: ${habitData.streak?.longest_streak || 0}

Please provide insights in the following JSON format:
{
  "overall_assessment": "Brief assessment of habit progress and psychological state",
  "cbt_insights": {
    "thought_patterns": "Analysis of automatic thoughts and cognitive distortions",
    "reframing_suggestions": "Specific cognitive reframing strategies"
  },
  "sdt_insights": {
    "autonomy_analysis": "Analysis of self-determination and autonomy",
    "competence_analysis": "Analysis of mastery and competence feelings",
    "relatedness_analysis": "Analysis of connection and social aspects",
    "improvement_suggestions": "Ways to improve SDT scores"
  },
  "atomic_habits_insights": {
    "cue_optimization": "How to make the cue more obvious",
    "craving_enhancement": "How to make the craving more attractive",
    "response_simplification": "How to make the response easier",
    "reward_optimization": "How to make the reward more satisfying"
  },
  "act_insights": {
    "values_alignment": "How well the habit aligns with stated values",
    "committed_action_review": "Analysis of committed actions",
    "psychological_flexibility": "Suggestions for increasing psychological flexibility"
  },
  "stage_specific_recommendations": {
    "current_stage": "${targetHabit.stage_of_change}",
    "recommendations": "Stage-specific strategies for progress",
    "next_stage_preparation": "How to prepare for the next stage"
  },
  "keystone_analysis": {
    "is_keystone": ${targetHabit.is_keystone},
    "ripple_effects": "Analysis of how this habit affects other areas",
    "leverage_opportunities": "How to maximize keystone benefits"
  },
  "actionable_recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "Specific, actionable recommendation 3"
  ],
  "motivation_strategies": [
    "Strategy to boost motivation 1",
    "Strategy to boost motivation 2",
    "Strategy to boost motivation 3"
  ]
}`,
    })

    let insightsData
    try {
      insightsData = JSON.parse(insights)
    } catch (parseError) {
      console.error('Error parsing AI insights:', parseError)
      // Fallback to a simple text response
      insightsData = {
        overall_assessment: insights,
        cbt_insights: {
          thought_patterns: 'Analysis not available',
          reframing_suggestions: 'Please try again',
        },
        sdt_insights: {
          autonomy_analysis: 'Analysis not available',
          competence_analysis: 'Analysis not available',
          relatedness_analysis: 'Analysis not available',
          improvement_suggestions: 'Please try again',
        },
        atomic_habits_insights: {
          cue_optimization: 'Analysis not available',
          craving_enhancement: 'Analysis not available',
          response_simplification: 'Analysis not available',
          reward_optimization: 'Analysis not available',
        },
        act_insights: {
          values_alignment: 'Analysis not available',
          committed_action_review: 'Analysis not available',
          psychological_flexibility: 'Analysis not available',
        },
        stage_specific_recommendations: {
          current_stage: targetHabit.stage_of_change,
          recommendations: 'Analysis not available',
          next_stage_preparation: 'Analysis not available',
        },
        keystone_analysis: {
          is_keystone: targetHabit.is_keystone,
          ripple_effects: 'Analysis not available',
          leverage_opportunities: 'Analysis not available',
        },
        actionable_recommendations: ['Please try again for detailed recommendations'],
        motivation_strategies: ['Please try again for motivation strategies'],
      }
    }

    // Store insights in database
    await supabase.from('habit_master_insights').insert({
      user_id: user.id,
      habit_id: targetHabit.id,
      insight_type: 'psychological_analysis',
      title: `AI Insights for ${targetHabit.title}`,
      content: JSON.stringify(insightsData),
      confidence_score: 0.85,
      is_positive: true,
      action_suggestion:
        insightsData.actionable_recommendations?.[0] || 'Continue your habit journey',
    })

    return NextResponse.json(insightsData)
  } catch (error) {
    console.error('Error in AI insights API:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
