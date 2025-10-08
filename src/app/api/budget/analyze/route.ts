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
    const { start_date, end_date, analysis_type = 'comprehensive' } = body

    // Set default date range if not provided (last 3 months)
    const endDate = end_date || new Date().toISOString().split('T')[0]
    const startDate =
      start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get user's transactions for the period
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(
        `
        *,
        bank_accounts!inner (
          name,
          type,
          bank_connections!inner (
            user_id
          )
        ),
        transaction_categorizations (
          category_id,
          budget_categories (
            name,
            color,
            is_income,
            is_fixed
          )
        )
      `
      )
      .eq('bank_accounts.bank_connections.user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          message:
            'No transactions found for the specified period. Please sync your bank accounts first.',
          insights: [],
          recommendations: [],
          spending_summary: {
            total_income: 0,
            total_expenses: 0,
            net_savings: 0,
            top_categories: [],
          },
        },
      })
    }

    // Get user's budget categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
    }

    // Process transaction data for AI analysis
    const transactionData = transactions.map((t) => ({
      date: t.date,
      amount: t.amount,
      name: t.name,
      merchant_name: t.merchant_name,
      category: t.category,
      account_name: t.bank_accounts.name,
      account_type: t.bank_accounts.type,
      is_income: t.amount > 0,
      manual_category: t.transaction_categorizations?.[0]?.budget_categories?.name || null,
    }))

    // Calculate basic spending summary
    const totalIncome = transactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)
    const totalExpenses = Math.abs(
      transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
    )
    const netSavings = totalIncome - totalExpenses

    // Calculate spending by category
    const categorySpending: Record<string, number> = {}
    transactions.forEach((t) => {
      if (t.amount < 0) {
        // Only expenses
        const categoryName =
          t.transaction_categorizations?.[0]?.budget_categories?.name ||
          t.category?.[0] ||
          'Uncategorized'
        categorySpending[categoryName] = (categorySpending[categoryName] || 0) + Math.abs(t.amount)
      }
    })

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount }))

    // Create AI prompt for budget analysis
    const prompt = `
You are an expert financial advisor and budget analyst. Analyze the following transaction data and provide comprehensive insights and recommendations.

TRANSACTION DATA (${startDate} to ${endDate}):
${JSON.stringify(transactionData.slice(0, 100), null, 2)} ${transactionData.length > 100 ? `\n... and ${transactionData.length - 100} more transactions` : ''}

SPENDING SUMMARY:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Savings: $${netSavings.toFixed(2)}
- Top Spending Categories: ${topCategories.map((c) => `${c.name}: $${c.amount.toFixed(2)}`).join(', ')}

BUDGET CATEGORIES:
${categories?.map((c) => `- ${c.name} (${c.is_income ? 'Income' : 'Expense'}, ${c.is_fixed ? 'Fixed' : 'Variable'})`).join('\n') || 'No custom categories defined'}

ANALYSIS TYPE: ${analysis_type}

Please provide a comprehensive budget analysis with the following structure:

1. SPENDING PATTERNS: Identify trends, unusual spending, and patterns
2. SAVINGS OPPORTUNITIES: Specific areas where money can be saved
3. BUDGET RECOMMENDATIONS: Suggested budget allocations and improvements
4. FINANCIAL HEALTH: Overall assessment of financial situation
5. ACTIONABLE INSIGHTS: Specific steps the user can take

Format your response as JSON with this structure:
{
  "spending_patterns": {
    "trends": ["List of spending trends identified"],
    "unusual_spending": ["Any unusual or concerning spending patterns"],
    "seasonal_patterns": ["Any seasonal or cyclical patterns"]
  },
  "savings_opportunities": [
    {
      "category": "Category name",
      "current_spending": 500.00,
      "potential_savings": 150.00,
      "savings_percentage": 30,
      "recommendation": "Specific recommendation for this category"
    }
  ],
  "budget_recommendations": {
    "income_allocation": {
      "needs": 50,
      "wants": 30,
      "savings": 20
    },
    "category_budgets": [
      {
        "category": "Category name",
        "recommended_amount": 500.00,
        "current_spending": 600.00,
        "adjustment": -100.00,
        "reasoning": "Why this adjustment is recommended"
      }
    ]
  },
  "financial_health": {
    "score": 75,
    "assessment": "Overall financial health assessment",
    "strengths": ["List of financial strengths"],
    "concerns": ["List of areas of concern"]
  },
  "actionable_insights": [
    {
      "priority": "high/medium/low",
      "action": "Specific action to take",
      "impact": "Expected impact of this action",
      "timeline": "When to implement this action"
    }
  ],
  "monthly_budget_suggestion": {
    "total_income": ${totalIncome},
    "recommended_expenses": ${totalIncome * 0.8},
    "recommended_savings": ${totalIncome * 0.2},
    "breakdown": "Detailed breakdown of recommended budget"
  }
}

Focus on actionable, specific recommendations that can help improve the user's financial situation. Be encouraging but realistic about challenges and opportunities.
`

    // Use AI to analyze the budget data
    const { text: analysis } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert financial advisor specializing in budget analysis and personal finance optimization. Provide detailed, actionable insights based on transaction data.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch {
      // If JSON parsing fails, return a structured response
      parsedAnalysis = {
        spending_patterns: {
          trends: ['Analysis provided in recommendations'],
          unusual_spending: ['See detailed analysis above'],
          seasonal_patterns: ['Pattern analysis included'],
        },
        savings_opportunities: [
          {
            category: 'General',
            current_spending: totalExpenses,
            potential_savings: totalExpenses * 0.1,
            savings_percentage: 10,
            recommendation: analysis,
          },
        ],
        budget_recommendations: {
          income_allocation: {
            needs: 50,
            wants: 30,
            savings: 20,
          },
          category_budgets: [],
        },
        financial_health: {
          score: 70,
          assessment: 'Based on your transaction data',
          strengths: ['Regular income and spending tracking'],
          concerns: ['Review detailed analysis for specific areas'],
        },
        actionable_insights: [
          {
            priority: 'medium',
            action: 'Review the detailed analysis above',
            impact: 'Improved financial awareness',
            timeline: 'Immediate',
          },
        ],
        monthly_budget_suggestion: {
          total_income: totalIncome,
          recommended_expenses: totalIncome * 0.8,
          recommended_savings: totalIncome * 0.2,
          breakdown: 'See detailed analysis above',
        },
      }
    }

    // Store insights in database
    const insightsToInsert = [
      {
        user_id: user.id,
        insight_type: 'spending_analysis',
        title: 'Spending Pattern Analysis',
        description: `Analysis of spending patterns from ${startDate} to ${endDate}`,
        data: {
          analysis_type,
          date_range: { start_date: startDate, end_date: endDate },
          transaction_count: transactions.length,
          spending_summary: {
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_savings: netSavings,
            top_categories: topCategories,
          },
        },
        priority: 'high',
      },
    ]

    await supabase.from('budget_insights').insert(insightsToInsert)

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
      spending_summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_savings: netSavings,
        top_categories: topCategories,
        transaction_count: transactions.length,
      },
      date_range: { start_date: startDate, end_date: endDate },
    })
  } catch (error) {
    console.error('Error in budget analysis:', error)

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
        error: 'Failed to analyze budget',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
