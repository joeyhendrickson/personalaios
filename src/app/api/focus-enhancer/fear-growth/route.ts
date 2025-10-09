import { NextRequest, NextResponse } from 'next/server'
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

    const { fear } = await request.json()

    if (!fear) {
      return NextResponse.json({ error: 'No fear data provided' }, { status: 400 })
    }

    // Generate growth suggestions based on the fear
    const { text: growthResponse } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `You are a specialized AI coach focused on the "Fears to Growth Goals Method". Your job is to transform specific fears into actionable, measurable growth opportunities.

For the given fear, analyze it using this framework:

1. **Fear Analysis**: Understand the core fear and its emotional drivers
2. **Growth Opportunity**: Identify how facing this fear can lead to personal growth
3. **Strategic Goals**: Create specific, measurable goals that address the fear
4. **Point System**: Assign point values that reflect the challenge and growth potential
5. **Habit Formation**: Suggest daily/weekly habits that build confidence
6. **Project Ideas**: Propose larger projects that tackle the fear systematically

Return your analysis in this exact JSON format:
{
  "growthOpportunity": "A clear statement of how this fear can become a growth opportunity",
  "suggestions": [
    {
      "title": "Habit/Project Title",
      "description": "Detailed description of the suggestion",
      "type": "habit/project",
      "category": "Category from: Health & Addiction, Relationships & Trust, Finance & Work, Identity & Self-Worth, Family & Responsibility, Purpose & Creativity",
      "points": 50,
      "target_points": 100,
      "frequency": "daily/weekly/monthly",
      "reasoning": "Why this suggestion addresses the fear"
    }
  ]
}

Focus on creating suggestions that:
- Directly address the specific fear
- Are measurable and achievable
- Build confidence through small wins
- Transform fear into positive action
- Include appropriate point values (10-500 points based on difficulty)

Be specific and actionable. Each suggestion should feel like a step toward conquering the fear.`,
        },
        {
          role: 'user',
          content: `Analyze this fear and generate growth suggestions:

**Fear**: ${fear.name}
**Severity**: ${fear.severity}
**Category**: ${fear.category}
**Current Coping**: ${fear.description}
**Impact**: ${fear.impact}
**Triggers**: ${fear.triggers}

Generate 3-5 specific growth suggestions that transform this fear into positive action. Focus on HABITS (daily behaviors) and PROJECTS (multi-week challenges), not goals.`,
        },
      ],
      temperature: 0.7,
    })

    let growthData
    try {
      const jsonMatch = growthResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        growthData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse growth response:', parseError)
      console.error('Raw response:', growthResponse)

      // Fallback growth suggestions
      growthData = {
        growthOpportunity: `This fear of "${fear.name}" can become an opportunity to build resilience and confidence in the ${fear.category} area of your life.`,
        suggestions: [
          {
            title: `Face ${fear.name} Gradually`,
            description: `Create a structured approach to gradually expose yourself to situations related to this fear, starting small and building confidence.`,
            type: 'project',
            category: fear.category,
            points: 100,
            target_points: 500,
            frequency: 'weekly',
            reasoning: 'Gradual exposure builds confidence while managing anxiety levels.',
          },
          {
            title: `Daily Confidence Building`,
            description: `Practice daily affirmations and small actions that build confidence in this area.`,
            type: 'habit',
            category: fear.category,
            points: 25,
            target_points: 100,
            frequency: 'daily',
            reasoning: 'Daily practice creates lasting change and builds positive momentum.',
          },
        ],
      }
    }

    // Store the fear analysis in the database
    const { error: insertError } = await supabase.from('user_fears_insights').insert({
      user_id: user.id,
      fear_type: fear.category.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      description: fear.name,
      severity: fear.severity,
      related_apps: fear.triggers ? [fear.triggers] : [],
      coping_strategies: fear.description ? [fear.description] : [],
      progress_notes: growthData.growthOpportunity,
    })

    if (insertError) {
      console.error('Error storing fear analysis:', insertError)
      // Don't fail the request if we can't store it
    }

    // Store the growth suggestions
    if (growthData.suggestions && growthData.suggestions.length > 0) {
      const suggestionInserts = growthData.suggestions.map((suggestion: any) => ({
        user_id: user.id,
        suggestion_type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        points_value: suggestion.points,
        target_points: suggestion.target_points,
      }))

      const { error: suggestionsError } = await supabase
        .from('focus_suggestions')
        .insert(suggestionInserts)

      if (suggestionsError) {
        console.error('Error storing growth suggestions:', suggestionsError)
      }
    }

    return NextResponse.json({
      growthOpportunity: growthData.growthOpportunity,
      suggestions: growthData.suggestions || [],
    })
  } catch (error: any) {
    console.error('Error generating fear growth suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate growth suggestions', details: error.message },
      { status: 500 }
    )
  }
}
