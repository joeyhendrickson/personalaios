import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterOpenAIRestCall } from '@/lib/ai/usage-logger'
import {
  formatEventMonitoringForPrompt,
  formatPredictionThesis,
  buildFallbackNewsTriggeredEntries,
} from '@/lib/day-trader/event-monitoring'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  let profitAdvisorAiStart: number | null = null
  let profitAdvisorUserId: string | null = null
  try {
    console.log('[Profit Advisor] Starting request')

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
      console.error('[Profit Advisor] OpenAI API key not configured')
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
      console.error('[Profit Advisor] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Profit Advisor] User authenticated:', user.id)
    profitAdvisorUserId = user.id

    const body = await request.json()
    console.log('[Profit Advisor] Request body received:', {
      stockSymbol: body.stockSymbol,
      profitGoal: body.profitGoal,
      timeframeDays: body.timeframeDays,
      hasPatterns: !!body.patterns,
      hasPrediction: !!body.prediction,
    })
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
      console.log('[Profit Advisor] Stock data fetched:', stockData ? 'Success' : 'No data')
    } catch (error) {
      console.error('[Profit Advisor] Error fetching stock data:', error)
      // Continue without stock data
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
${(informationSources || []).map((source: any) => `- ${source.name} (${source.type}): ${source.weight}% weight`).join('\n')}

PREDICTION THESIS (align entries with this unless headline strongly contradicts):
${formatPredictionThesis(prediction)}

ENABLED EVENT MONITORING — build news-triggered entry rules ONLY for these categories:
${formatEventMonitoringForPrompt(eventMonitoring)}

NEWS-TRIGGERED ENTRY REQUIREMENTS:
For EACH enabled event category above, provide a playbook entry that:
1. Lists 2-4 realistic headline examples (include geopolitical examples like "War in Iran continues" when federalEvents is enabled).
2. Explains the typical historical correlation between that headline type and ${stockSymbol} price action (sector beta, risk-on/risk-off, etc.).
3. States whether the headline SUPPORTS or CONTRADICTS the prediction thesis (${prediction?.direction || 'see prediction'}).
4. Recommends a SPECIFIC position type to enter when the headline appears AND supports the thesis: shares long, shares short, options calls, options puts, spread, or wait/no entry.
5. States what to do if the headline contradicts the thesis (reduce size, hedge, wait for confirmation, exit).

Based on this comprehensive analysis, provide a PROFIT ADVISOR with specific trade recommendations to achieve $${profitGoal} in ${timeframeDays} days.

Consider the investor type:
- ${getInvestorStrategy(investorType)}

Focus on the LOWEST RISK approaches first, then higher risk/higher reward strategies.

CRITICAL: You MUST return ONLY valid JSON. Do NOT include any explanatory text, comments, or parentheses within JSON values. All values must be clean numbers or strings only.

Examples of WRONG format:
- "entryPrice": 4.00 (net credit received)" ❌
- "targetPrice": 0.50 (spread decay)" ❌

Examples of CORRECT format:
- "entryPrice": 4.00 ✅
- "targetPrice": 0.50 ✅

Return ONLY this JSON structure:
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
  },
  "newsTriggeredEntries": [
    {
      "eventCategory": "Federal / Geopolitical Events",
      "headlineExamples": [
        "War in Iran continues as oil tankers rerouted",
        "US announces new sanctions on energy exports"
      ],
      "entryTrigger": "Headline confirms sustained geopolitical risk AND ${stockSymbol} moves in direction of thesis within 30 minutes",
      "recommendedPosition": "options_puts",
      "thesisAlignment": "supports",
      "historicalCorrelation": "Brief historical pattern for this symbol/sector when similar headlines hit",
      "entryAction": "Enter defined put position size per risk rules when headline + price confirm thesis",
      "ifHeadlineContradictsThesis": "Do not enter; wait for price to confirm or hedge existing exposure"
    }
  ]
}

Provide REALISTIC and ACHIEVABLE trade recommendations based on the actual pattern analysis and predictions. Focus on the lowest risk approaches that can still achieve the profit goal within the timeframe.
`

    // Use the same model as other endpoints
    console.log('[Profit Advisor] Calling OpenAI API')
    const model = resolveOpenAIModelId()
    profitAdvisorAiStart = Date.now()
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert trading advisor specializing in profit optimization and event-driven entries. Provide realistic trade recommendations grounded in pattern analysis, the stated prediction thesis, and historical correlations for the user-selected news/event categories. Always prioritize risk management.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      // NOTE: gpt-5 models only support the default temperature via Chat Completions.
      // Passing a custom temperature returns a 400 and breaks this endpoint.
    })

    await logAfterOpenAIRestCall({
      startMs: profitAdvisorAiStart,
      userId: user.id,
      module: 'day_trader',
      action: 'profit_advisor_plan',
      route: '/api/modules/day-trader/profit-advisor',
      model,
      description: 'Generated a trading plan outline from pattern summaries you saved.',
      response: completion,
    })

    const advisorResponse = completion.choices[0]?.message?.content
    console.log(
      '[Profit Advisor] OpenAI response received:',
      advisorResponse ? 'Success' : 'No response'
    )

    if (!advisorResponse) {
      return NextResponse.json({ error: 'Failed to generate profit advisor' }, { status: 500 })
    }

    let parsedAdvisor
    try {
      console.log('[Profit Advisor] Parsing JSON response')
      // Clean the response by removing markdown code blocks and explanatory text in parentheses
      const cleanedResponse = advisorResponse
        .replace(/```json\s*/g, '') // Remove opening ```json
        .replace(/```\s*$/g, '') // Remove closing ```
        .replace(/\([^)]*\)/g, '') // Remove explanatory text in parentheses
        .replace(/\s+/g, ' ')
        .trim()
      console.log('[Profit Advisor] Cleaned response:', cleanedResponse.substring(0, 500) + '...')
      parsedAdvisor = JSON.parse(cleanedResponse)
      console.log('[Profit Advisor] JSON parsed successfully')
    } catch (parseError) {
      console.error('[Profit Advisor] JSON parse error:', parseError)
      console.error('[Profit Advisor] Raw response:', advisorResponse)
      // If JSON parsing fails, return a structured response
      // Use more realistic position sizing based on investor type and buying power
      const maxPositionSize = investorType === 'long_term' ? 0.3 : 0.1 // 30% for long-term, 10% for others
      const sharesToBuy = Math.floor(
        (buyingPower * maxPositionSize) / (stockData?.latestPrice || 1)
      )
      const actualInvestment = sharesToBuy * (stockData?.latestPrice || 1)
      const realisticProfit = actualInvestment * (investorType === 'long_term' ? 0.15 : 0.05) // 15% for long-term, 5% for others

      parsedAdvisor = {
        advisorSummary: {
          feasibility: investorType === 'long_term' ? 'high' : 'medium',
          riskAssessment: investorType === 'long_term' ? 'low' : 'medium',
          recommendedApproach:
            investorType === 'long_term'
              ? 'Long-term value investment with fundamental analysis'
              : 'Conservative stock purchase based on analysis',
          dailyTarget: dailyProfitTarget,
          totalTarget: profitGoal,
          timeframe: timeframeDays,
        },
        optimalTrades: [
          {
            tradeType: 'shares',
            strategy:
              investorType === 'long_term'
                ? 'Long-term value investment strategy'
                : 'Conservative stock purchase',
            entryPrice: stockData?.latestPrice || 0,
            targetPrice:
              (stockData?.latestPrice || 0) * (investorType === 'long_term' ? 1.15 : 1.05),
            stopLoss: (stockData?.latestPrice || 0) * (investorType === 'long_term' ? 0.9 : 0.95),
            positionSize: sharesToBuy,
            investmentAmount: actualInvestment,
            expectedProfit: realisticProfit,
            riskLevel: investorType === 'long_term' ? 'low' : 'medium',
            timeframe: investorType === 'long_term' ? '3-7 days' : '1-2 days',
            confidence: investorType === 'long_term' ? 85 : 70,
            reasoning:
              investorType === 'long_term'
                ? 'Long-term value approach: ' + advisorResponse.substring(0, 200) + '...'
                : 'Conservative approach: ' + advisorResponse.substring(0, 200) + '...',
            executionWindow: 'Market hours',
            exitStrategy:
              investorType === 'long_term'
                ? 'Hold for 15% gain or stop loss at 10% loss'
                : 'Take profit at 5% gain or stop loss at 5% loss',
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
        newsTriggeredEntries: buildFallbackNewsTriggeredEntries(
          eventMonitoring,
          prediction?.direction,
          stockSymbol
        ),
      }
    }

    if (!Array.isArray(parsedAdvisor.newsTriggeredEntries)) {
      parsedAdvisor.newsTriggeredEntries = buildFallbackNewsTriggeredEntries(
        eventMonitoring,
        prediction?.direction,
        stockSymbol
      )
    }

    return NextResponse.json({
      success: true,
      advisor: parsedAdvisor,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in profit advisor generation:', error)
    if (profitAdvisorAiStart != null && profitAdvisorUserId) {
      await logAfterOpenAIRestCall({
        startMs: profitAdvisorAiStart,
        userId: profitAdvisorUserId,
        module: 'day_trader',
        action: 'profit_advisor_plan',
        route: '/api/modules/day-trader/profit-advisor',
        model: resolveOpenAIModelId(),
        description: 'Generated a trading plan outline from pattern summaries you saved.',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

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
    default:
      return 'General trading approach with balanced risk management'
  }
}
