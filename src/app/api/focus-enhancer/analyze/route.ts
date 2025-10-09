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

    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    // Analyze the screen time screenshot using AI
    const { text: analysisResult } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this screen time summary screenshot and provide a comprehensive analysis. 

Look for:
1. App names and daily usage hours
2. Identify potentially problematic apps (social media, adult content, games, etc.)
3. Calculate total screen time
4. Identify patterns of excessive usage

Return your analysis in this exact JSON format:
{
  "appUsage": [
    {
      "appName": "Instagram",
      "hours": 3.5,
      "category": "Social Media",
      "isProblematic": true,
      "insights": "High usage may indicate validation-seeking behavior or fear of missing out"
    }
  ],
  "totalScreenTime": 8.5,
  "problematicApps": ["Instagram", "TikTok"],
  "insights": [
    {
      "type": "validation",
      "description": "Spending 3.5 hours daily on Instagram suggests seeking external validation",
      "severity": "high",
      "suggestions": [
        "Practice self-affirmation exercises",
        "Limit Instagram to 30 minutes daily",
        "Identify what validation you're seeking and address it directly"
      ]
    }
  ],
  "suggestedGoals": [
    {
      "title": "Reduce Social Media Dependency",
      "description": "Cut social media usage by 50% and focus on real-world relationships",
      "category": "Personal Development",
      "target_points": 1000,
      "current_points": 0
    }
  ],
  "suggestedHabits": [
    {
      "title": "Morning Mindfulness",
      "description": "Start each day with 10 minutes of meditation instead of checking social media",
      "category": "Wellness",
      "points_value": 50
    },
    {
      "title": "Scheduled App Check-ins",
      "description": "Designate specific times for checking social media and finance apps to build healthier boundaries",
      "category": "Digital Wellness",
      "points_value": 25
    }
  ],
  "suggestedProjects": [
    {
      "title": "Digital Detox Challenge",
      "description": "30-day challenge to reduce screen time and build healthier digital habits",
      "category": "Personal Development",
      "target_points": 500,
      "current_points": 0
    }
  ]
}

Be thorough and compassionate in your analysis. Focus on understanding the emotional drivers behind app usage.`,
            },
            {
              type: 'image',
              image: imageData,
            },
          ],
        },
      ],
      temperature: 0.7,
    })

    let analysisData
    try {
      // Extract JSON from the response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', analysisResult)

      // Fallback analysis
      analysisData = {
        appUsage: [
          {
            appName: 'Unknown Apps',
            hours: 0,
            category: 'Unknown',
            isProblematic: false,
            insights:
              'Unable to parse screen time data. Please ensure the screenshot is clear and shows app usage statistics.',
          },
        ],
        totalScreenTime: 0,
        problematicApps: [],
        insights: [
          {
            type: 'error',
            description:
              'Could not analyze the screenshot. Please try uploading a clearer image of your screen time summary.',
            severity: 'low',
            suggestions: [
              'Ensure the screenshot shows app names and usage hours clearly',
              'Try taking a screenshot in better lighting',
            ],
          },
        ],
        suggestedGoals: [],
        suggestedHabits: [],
        suggestedProjects: [],
      }
    }

    // Store the analysis in the database for future reference
    const { error: insertError } = await supabase.from('focus_analyses').insert({
      user_id: user.id,
      app_usage_data: analysisData.appUsage,
      total_screen_time: analysisData.totalScreenTime,
      problematic_apps: analysisData.problematicApps,
      insights: analysisData.insights,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error storing analysis:', insertError)
      // Don't fail the request if we can't store it
    }

    return NextResponse.json({
      appUsage: analysisData.appUsage,
      totalScreenTime: analysisData.totalScreenTime,
      problematicApps: analysisData.problematicApps,
      insights: analysisData.insights,
      suggestedGoals: analysisData.suggestedGoals,
      suggestedHabits: analysisData.suggestedHabits,
      suggestedProjects: analysisData.suggestedProjects,
    })
  } catch (error: any) {
    console.error('Error analyzing screen time:', error)
    return NextResponse.json(
      { error: 'Failed to analyze screen time', details: error.message },
      { status: 500 }
    )
  }
}
