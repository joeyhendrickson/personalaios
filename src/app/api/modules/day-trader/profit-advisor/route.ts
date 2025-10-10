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
    const {
      stockSymbol,
      buyingPower,
      investorType,
      profitGoal,
      timeframeDays,
      patterns,
      prediction,
      informationSources,
      eventMonitoring,
    } = body

    if (!stockSymbol || !profitGoal || !timeframeDays) {
      return NextResponse.json(
        {
          error: 'Missing required fields: stockSymbol, profitGoal, and timeframeDays are required',
        },
        { status: 400 }
      )
    }

    if (!patterns || !prediction) {
      return NextResponse.json(
        {
          error:
            'Both pattern analysis and prediction must be completed before generating profit advisor',
        },
        { status: 400 }
      )
    }

    // Get real-time stock data
    let stockData = null
    try {
      const { StockDataService } = await import('@/lib/stock-data')
      stockData = await StockDataService.getStockData(stockSymbol)
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }

    // Calculate daily profit target
    const dailyProfitTarget = profitGoal / timeframeDays
    const requiredReturnPercentage = (dailyProfitTarget / buyingPower) * 100

    // Create comprehensive AI prompt for profit advisor
    const prompt = `
You are an expert trading advisor specializing in profit optimization strategies. Based on the completed pattern analysis and predictions, provide specific trade recommendations to achieve the user's profit goal.

USER PROFILE:
- Stock Symbol: ${stockSymbol}
- Investor Type: ${investorType}
- Buying Power: $${buyingPower?.toLocaleString()}
- Profit Goal: $${profitGoal?.toLocaleString()}
- Timeframe: ${timeframeDays} days
- Daily Profit Target: $${dailyProfitTarget.toFixed(2)}
- Required Return: ${requiredReturnPercentage.toFixed(2)}% per day

REAL-TIME MARKET DATA:
${
  stockData
    ? `
- Current Price: $${stockData.latestPrice}
- Open: $${stockData.open}
- High: $${stockData.high}
- Low: $${stockData.low}
- Volume: ${stockData.volume.toLocaleString()}
- Previous Close: $${stockData.previousClose}
- Price Change: ${stockData.previousClose ? (((stockData.latestPrice - stockData.previousClose) / stockData.previousClose) * 100).toFixed(2) + '%' : 'N/A'}
`
    : `
- Stock Symbol: ${stockSymbol}
- Note: Real-time data unavailable, using analysis-based recommendations
`
}

COMPLETED PATTERN ANALYSIS:
${JSON.stringify(patterns, null, 2)}

COMPLETED PREDICTION ANALYSIS:
${JSON.stringify(prediction, null, 2)}

INFORMATION SOURCES:
${informationSources.map((source: any) => `- ${source.name} (${source.type}): ${source.weight}% weight`).join('\n')}

EVENT MONITORING:
${Object.entries(eventMonitoring)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Based on this comprehensive analysis, provide a PROFIT ADVISOR with specific trade recommendations to achieve $${profitGoal} in ${timeframeDays} days.

Consider the investor type:
- ${getInvestorStrategy(investorType)}

Focus on the LOWEST RISK approaches first, then higher risk/higher reward strategies.

Format your response as JSON with this structure:
{
  "advisorSummary": {
    "feasibility": "high/medium/low",
    "riskAssessment": "low/medium/high",
    "recommendedApproach": "Brief description of the best strategy",
    "dailyTarget": ${dailyProfitTarget},
    "totalTarget": ${profitGoal},
    "timeframe": ${timeframeDays}
  },
  "optimalTrades": [
    {
      "tradeType": "shares/options_calls/options_puts",
      "strategy": "Specific strategy name",
      "entryPrice": 185.50,
      "targetPrice": 192.00,
      "stopLoss": 180.00,
      "positionSize": 100,
      "investmentAmount": 18550,
      "expectedProfit": 650,
      "riskLevel": "low/medium/high",
      "timeframe": "1-2 days",
      "confidence": 85,
      "reasoning": "Why this trade is optimal based on patterns and predictions",
      "executionWindow": "9:30-11:00 AM",
      "exitStrategy": "Specific exit conditions"
    }
  ],
  "riskManagement": {
    "maxRiskPerTrade": 500,
    "totalPortfolioRisk": 2000,
    "positionSizing": "Conservative/Moderate/Aggressive",
    "stopLossStrategy": "Specific stop loss approach"
  },
  "dailyPlan": {
    "day1": "Specific actions for day 1",
    "day2": "Specific actions for day 2",
    "day3": "Specific actions for day 3 (if applicable)"
  },
  "contingencyPlans": [
    "What to do if market moves against you",
    "Alternative strategies if primary plan fails"
  ],
  "successMetrics": {
    "minimumDailyProfit": ${(dailyProfitTarget * 0.7).toFixed(2)},
    "targetDailyProfit": ${dailyProfitTarget.toFixed(2)},
    "maximumAcceptableLoss": ${(dailyProfitTarget * 0.5).toFixed(2)}
  }
}

Provide REALISTIC and ACHIEVABLE trade recommendations based on the actual pattern analysis and predictions. Focus on the lowest risk approaches that can still achieve the profit goal within the timeframe.
`

    // Use the same model as other endpoints
    const { text: advisorResponse } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert trading advisor specializing in profit optimization strategies. Provide realistic, achievable trade recommendations based on technical analysis and market predictions. Always prioritize risk management and realistic profit expectations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    })

    if (!advisorResponse) {
      return NextResponse.json({ error: 'Failed to generate profit advisor' }, { status: 500 })
    }

    let parsedAdvisor
    try {
      parsedAdvisor = JSON.parse(advisorResponse)
    } catch (parseError) {
      // If JSON parsing fails, return a structured response
      parsedAdvisor = {
        advisorSummary: {
          feasibility: 'medium',
          riskAssessment: 'medium',
          recommendedApproach: 'Analysis provided in recommendations',
          dailyTarget: dailyProfitTarget,
          totalTarget: profitGoal,
          timeframe: timeframeDays,
        },
        optimalTrades: [
          {
            tradeType: 'shares',
            strategy: 'Conservative approach based on analysis',
            entryPrice: stockData?.latestPrice || 0,
            targetPrice: (stockData?.latestPrice || 0) * 1.05,
            stopLoss: (stockData?.latestPrice || 0) * 0.95,
            positionSize: Math.floor((buyingPower / (stockData?.latestPrice || 1)) * 0.1),
            investmentAmount: buyingPower * 0.1,
            expectedProfit: dailyProfitTarget,
            riskLevel: 'medium',
            timeframe: '1-2 days',
            confidence: 70,
            reasoning: advisorResponse,
            executionWindow: 'Market hours',
            exitStrategy: 'Take profit at target or stop loss',
          },
        ],
        riskManagement: {
          maxRiskPerTrade: buyingPower * 0.1,
          totalPortfolioRisk: buyingPower * 0.2,
          positionSizing: 'Conservative',
          stopLossStrategy: 'Set stop loss at 5% below entry',
        },
        dailyPlan: {
          day1: 'Execute primary trade strategy',
          day2: 'Monitor and adjust positions',
          day3: 'Close positions and evaluate results',
        },
        contingencyPlans: [
          'Reduce position size if market moves against you',
          'Consider alternative strategies if primary plan fails',
        ],
        successMetrics: {
          minimumDailyProfit: (dailyProfitTarget * 0.7).toFixed(2),
          targetDailyProfit: dailyProfitTarget.toFixed(2),
          maximumAcceptableLoss: (dailyProfitTarget * 0.5).toFixed(2),
        },
      }
    }

    return NextResponse.json({
      success: true,
      advisor: parsedAdvisor,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in profit advisor generation:', error)

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
        error: 'Failed to generate profit advisor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getInvestorStrategy(type: string): string {
  switch (type) {
    case 'long_term':
      return 'Long-term value investing with 3+ month holding periods - focus on shares with strong fundamentals'
    case 'scalper':
      return 'Short-term momentum trading with quick entries and exits - focus on options with short timeframes'
    case 'options_trader':
      return 'Options trading with calls and puts, focusing on theta and volatility - balance between calls and puts'
    case 'gambler':
      return 'High-risk, high-reward trading with short-term options - focus on high-probability setups with maximum leverage'
    default:
      return 'General trading approach with balanced risk management'
  }
}
