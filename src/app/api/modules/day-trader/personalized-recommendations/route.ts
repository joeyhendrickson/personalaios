import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface DashboardData {
  goals: Array<{
    title: string
    description?: string
    category: string
  }>
  tasks: Array<{
    title: string
    description?: string
    category?: string
  }>
  habits: Array<{
    name: string
    description?: string
    category?: string
  }>
  priorities: Array<{
    title: string
    description?: string
    category?: string
  }>
}

interface StockRecommendation {
  symbol: string
  companyName: string
  sector: string
  reason: string
  alignment: string
  confidence: number
  currentPrice?: number
  marketCap?: string
  growthPotential: 'low' | 'medium' | 'high'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's dashboard data
    const [goalsResult, tasksResult, habitsResult, prioritiesResult] = await Promise.all([
      supabase.from('weekly_goals').select('title, description, category').eq('user_id', user.id),
      supabase.from('tasks').select('title, description, category').eq('user_id', user.id),
      supabase.from('daily_habits').select('name, description, category').eq('user_id', user.id),
      supabase
        .from('priorities')
        .select('title, description, category')
        .eq('user_id', user.id)
        .eq('deleted', false),
    ])

    const dashboardData: DashboardData = {
      goals: goalsResult.data || [],
      tasks: tasksResult.data || [],
      habits: habitsResult.data || [],
      priorities: prioritiesResult.data || [],
    }

    // Create a comprehensive profile from dashboard data
    const profileText = `
User Profile Analysis:
- Goals: ${dashboardData.goals.map((g) => `${g.title} (${g.category})`).join(', ')}
- Tasks: ${dashboardData.tasks.map((t) => `${t.title} (${t.category || 'uncategorized'})`).join(', ')}
- Habits: ${dashboardData.habits.map((h) => `${h.name} (${h.category || 'uncategorized'})`).join(', ')}
- Priorities: ${dashboardData.priorities.map((p) => `${p.title} (${p.category || 'uncategorized'})`).join(', ')}

Key Themes Identified:
${extractThemes(dashboardData)}
`

    // Generate stock recommendations using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a financial advisor who analyzes personal lifestyle data to recommend relevant stock investments. 

Based on the user's goals, tasks, habits, and priorities, recommend 5 specific stock symbols that align with their interests and activities.

For each recommendation, provide:
1. Stock symbol (e.g., AAPL, TSLA, MSFT)
2. Company name
3. Sector/industry
4. Specific reason why this stock aligns with their profile
5. How it connects to their activities/goals
6. Confidence level (1-10)
7. Growth potential (low/medium/high)

Consider these alignment patterns:
- DeFi/crypto interests → Bitcoin mining, blockchain companies
- Farming/agriculture → Agricultural equipment, seed companies, farm tech
- Health/fitness → Health tech, fitness companies, nutrition
- Technology → Tech companies, software, hardware
- Business growth → Business services, consulting, growth companies
- Learning/education → EdTech, publishing, online learning
- Financial goals → Financial services, fintech, investment companies

Return ONLY a valid JSON array of 5 stock recommendations with this exact structure:
[
  {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "sector": "Technology",
    "reason": "User shows interest in productivity and organization tools",
    "alignment": "Apple's ecosystem aligns with user's focus on efficiency and seamless workflow",
    "confidence": 8,
    "growthPotential": "medium"
  }
]`,
        },
        {
          role: 'user',
          content: profileText,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const recommendationsText = completion.choices[0]?.message?.content
    if (!recommendationsText) {
      throw new Error('No recommendations generated')
    }

    // Parse the JSON response
    let recommendations: StockRecommendation[]
    try {
      recommendations = JSON.parse(recommendationsText)
    } catch (parseError) {
      console.error('Failed to parse recommendations:', parseError)
      // Fallback recommendations if parsing fails
      recommendations = [
        {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          sector: 'Technology',
          reason: 'Technology and productivity focus',
          alignment: 'Aligns with modern lifestyle and productivity goals',
          confidence: 7,
          growthPotential: 'medium',
        },
        {
          symbol: 'MSFT',
          companyName: 'Microsoft Corporation',
          sector: 'Technology',
          reason: 'Business and productivity tools',
          alignment: 'Supports business growth and organization goals',
          confidence: 7,
          growthPotential: 'medium',
        },
        {
          symbol: 'TSLA',
          companyName: 'Tesla Inc.',
          sector: 'Automotive/Energy',
          reason: 'Innovation and sustainability focus',
          alignment: 'Matches interest in innovation and future planning',
          confidence: 6,
          growthPotential: 'high',
        },
        {
          symbol: 'NVDA',
          companyName: 'NVIDIA Corporation',
          sector: 'Technology',
          reason: 'AI and technology advancement',
          alignment: 'Supports tech-forward thinking and innovation',
          confidence: 6,
          growthPotential: 'high',
        },
        {
          symbol: 'VTI',
          companyName: 'Vanguard Total Stock Market ETF',
          sector: 'Financial Services',
          reason: 'Diversified investment approach',
          alignment: 'Provides broad market exposure for financial goals',
          confidence: 8,
          growthPotential: 'medium',
        },
      ]
    }

    // Enhance recommendations with additional data if available
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          // You could add real-time stock data here if you have access to a financial API
          // For now, we'll return the AI-generated recommendations
          return {
            ...rec,
            currentPrice: null, // Could be populated with real data
            marketCap: null, // Could be populated with real data
          }
        } catch (error) {
          console.error(`Error enhancing recommendation for ${rec.symbol}:`, error)
          return rec
        }
      })
    )

    return NextResponse.json({
      recommendations: enhancedRecommendations,
      profileAnalysis: profileText,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating personalized recommendations:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function extractThemes(dashboardData: DashboardData): string {
  const allText = [
    ...dashboardData.goals.map((g) => `${g.title} ${g.description || ''} ${g.category}`),
    ...dashboardData.tasks.map((t) => `${t.title} ${t.description || ''} ${t.category || ''}`),
    ...dashboardData.habits.map((h) => `${h.name} ${h.description || ''} ${h.category || ''}`),
    ...dashboardData.priorities.map((p) => `${p.title} ${p.description || ''} ${p.category || ''}`),
  ]
    .join(' ')
    .toLowerCase()

  const themes = []

  // Technology themes
  if (
    allText.includes('tech') ||
    allText.includes('software') ||
    allText.includes('ai') ||
    allText.includes('digital')
  ) {
    themes.push('Technology & Innovation')
  }

  // Health themes
  if (
    allText.includes('health') ||
    allText.includes('fitness') ||
    allText.includes('exercise') ||
    allText.includes('wellness')
  ) {
    themes.push('Health & Wellness')
  }

  // Business themes
  if (
    allText.includes('business') ||
    allText.includes('entrepreneur') ||
    allText.includes('startup') ||
    allText.includes('growth')
  ) {
    themes.push('Business & Entrepreneurship')
  }

  // Financial themes
  if (
    allText.includes('money') ||
    allText.includes('financial') ||
    allText.includes('investment') ||
    allText.includes('wealth')
  ) {
    themes.push('Financial Growth')
  }

  // Learning themes
  if (
    allText.includes('learn') ||
    allText.includes('education') ||
    allText.includes('study') ||
    allText.includes('skill')
  ) {
    themes.push('Learning & Development')
  }

  // Agriculture themes
  if (
    allText.includes('farm') ||
    allText.includes('agriculture') ||
    allText.includes('crop') ||
    allText.includes('livestock')
  ) {
    themes.push('Agriculture & Farming')
  }

  // Crypto/DeFi themes
  if (
    allText.includes('crypto') ||
    allText.includes('bitcoin') ||
    allText.includes('defi') ||
    allText.includes('blockchain')
  ) {
    themes.push('Cryptocurrency & DeFi')
  }

  return themes.length > 0 ? themes.join(', ') : 'General lifestyle and productivity focus'
}
