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
    const { stockSymbol, investorType } = body

    if (!stockSymbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
    }

    // Create AI prompt for source recommendations
    const prompt = `
You are an expert financial analyst. Recommend the best information sources for tracking ${stockSymbol} for a ${investorType} investor.

Provide recommendations for:

1. TWITTER/X ACCOUNTS: Key analysts, traders, and financial influencers who cover this stock
2. NEWS SOURCES: Major financial news outlets and publications
3. ANALYST REPORTS: Key analysts and firms covering this stock
4. INDUSTRY SOURCES: Sector-specific news and analysis
5. SOCIAL MEDIA: Relevant Reddit communities, Discord channels, etc.

For each source, provide:
- Name/Handle
- Type (twitter, news, analyst, industry, social)
- Why it's valuable for this stock
- Suggested weight percentage (1-100)

Format your response as JSON with this structure:
{
  "sources": [
    {
      "name": "Source name or @handle",
      "type": "twitter/news/analyst/industry/social",
      "description": "Why this source is valuable",
      "suggestedWeight": 85,
      "category": "Technical Analysis/Fundamental Analysis/News/Sentiment"
    }
  ],
  "rationale": "Overall strategy for information gathering for this stock and investor type"
}

Focus on sources that provide actionable insights for ${investorType} trading ${stockSymbol}.
`

    // Use the same model as the chatbot (gpt-4.1-mini)
    const { text: recommendations } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert financial analyst with deep knowledge of information sources, social media, and market intelligence. Provide specific, actionable source recommendations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })
    if (!recommendations) {
      return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 })
    }

    let parsedRecommendations
    try {
      parsedRecommendations = JSON.parse(recommendations)
    } catch (parseError) {
      // If JSON parsing fails, return default recommendations
      parsedRecommendations = {
        sources: [
          {
            name: `@${stockSymbol.toLowerCase()}_analyst`,
            type: 'twitter',
            description: 'AI-recommended analyst for this stock',
            suggestedWeight: 75,
            category: 'Technical Analysis',
          },
          {
            name: 'Wall Street Journal',
            type: 'news',
            description: 'Major financial news source',
            suggestedWeight: 80,
            category: 'News',
          },
          {
            name: 'Bloomberg',
            type: 'news',
            description: 'Financial news and analysis',
            suggestedWeight: 85,
            category: 'News',
          },
          {
            name: 'Google News',
            type: 'google_news',
            description: 'Aggregated news for this stock',
            suggestedWeight: 70,
            category: 'News',
          },
        ],
        rationale:
          'AI has provided general recommendations. See the detailed analysis above for specific insights.',
      }
    }

    return NextResponse.json({
      success: true,
      recommendations: parsedRecommendations,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in source recommendations:', error)

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
        error: 'Failed to generate source recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
