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
    const { stockSymbol, buyingPower, investorType, informationSources, eventMonitoring } = body

    // Get real-time stock data using our new service
    let stockData = null
    try {
      const { StockDataService } = await import('@/lib/stock-data')
      stockData = await StockDataService.getStockData(stockSymbol)
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }

    if (!stockSymbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
    }

    // Create AI prompt for daily prediction
    const prompt = `
You are an expert day trading analyst with access to real-time market data. Provide a detailed daily prediction and strategic advisory for ${stockSymbol}.

REAL-TIME MARKET DATA:
${
  stockData
    ? `
- Current Price: $${stockData.latestPrice}
- Open: $${stockData.open}
- High: $${stockData.high}
- Low: $${stockData.low}
- Volume: ${stockData.volume.toLocaleString()}
- Latest Date: ${stockData.date}
- Previous Close: ${stockData.previousClose ? `$${stockData.previousClose}` : 'N/A'}
- Price Change: ${stockData.previousClose ? (((stockData.latestPrice - stockData.previousClose) / stockData.previousClose) * 100).toFixed(2) + '%' : 'N/A'}
`
    : `
- Stock Symbol: ${stockSymbol}
- Note: Real-time data unavailable, provide analysis based on general market knowledge
`
}

INVESTOR PROFILE:
- Type: ${investorType}
- Buying Power: $${buyingPower?.toLocaleString() || 'Not specified'}
- Risk Tolerance: ${getRiskTolerance(investorType)}

INFORMATION SOURCES (with weights):
${informationSources.map((source: any) => `- ${source.name} (${source.type}): ${source.weight}% weight`).join('\n')}

EVENT MONITORING:
${Object.entries(eventMonitoring)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Provide a comprehensive daily prediction based on REAL market data:

1. DAILY DIRECTION: Up/Down/Sideways with confidence percentage based on current price action
2. TIME-BASED ANALYSIS: Specific predictions for different times of day based on current momentum
3. KEY INDICATORS: What to watch for volume, price action, etc. based on current levels
4. RISK ASSESSMENT: Overall risk level considering current market conditions
5. STRATEGIC RECOMMENDATIONS: Specific actions for this investor type based on real data

Format your response as JSON with this structure:
{
  "direction": "up/down/sideways",
  "confidence": 75,
  "timeframes": {
    "morning": "9:30-11:00 AM analysis and predictions",
    "afternoon": "1:00-3:00 PM analysis and predictions", 
    "endOfDay": "3:30-4:00 PM power hour predictions"
  },
  "keyIndicators": [
    "Specific indicators to watch",
    "Volume thresholds",
    "Price levels to monitor"
  ],
  "riskLevel": "low/medium/high",
  "optionsStrategy": {
    "calls": {
      "strikePrice": 185.00,
      "timeWindow": "9:30-11:00 AM",
      "expectedProfit": "15-25%",
      "riskLevel": "medium"
    },
    "puts": {
      "strikePrice": 175.00,
      "timeWindow": "2:00-3:30 PM",
      "expectedProfit": "20-30%",
      "riskLevel": "high"
    }
  },
  "positionSizing": {
    "totalBuyingPower": ${buyingPower},
    "recommendedAllocation": 2500,
    "maxRiskPerTrade": 500,
    "numberOfContracts": 5
  },
  "marketContext": "Overall market conditions affecting this stock",
  "catalystEvents": "Any upcoming events that could impact price"
}

Focus on actionable, time-specific advice for a ${investorType} with $${buyingPower} buying power. Provide specific strike prices and time windows for options execution based on current market data.
`

    // Use the same model as the chatbot (gpt-4.1-mini)
    const { text: prediction } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert day trading analyst specializing in intraday predictions and strategic trading advice. Provide specific, actionable recommendations with time-based analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    })
    if (!prediction) {
      return NextResponse.json({ error: 'Failed to generate prediction' }, { status: 500 })
    }

    let parsedPrediction
    try {
      parsedPrediction = JSON.parse(prediction)
    } catch (parseError) {
      // If JSON parsing fails, return a structured response
      parsedPrediction = {
        direction: 'sideways',
        confidence: 70,
        timeframes: {
          morning: 'Market analysis provided in recommendations',
          afternoon: 'See detailed analysis above',
          endOfDay: 'Power hour analysis included',
        },
        keyIndicators: [
          'Volume spikes above average',
          'Key support/resistance levels',
          'Market sentiment indicators',
        ],
        riskLevel: 'medium',
        recommendations: [prediction],
        marketContext: 'Based on current market conditions and your information sources',
        catalystEvents: 'Monitor for any upcoming earnings or news events',
      }
    }

    return NextResponse.json({
      success: true,
      prediction: parsedPrediction,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in prediction generation:', error)

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
        error: 'Failed to generate prediction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getRiskTolerance(type: string): string {
  switch (type) {
    case 'long_term':
      return 'Low to moderate risk tolerance, focused on capital preservation'
    case 'scalper':
      return 'Moderate risk tolerance, quick profit taking'
    case 'options_trader':
      return 'High risk tolerance, comfortable with options volatility'
    case 'gambler':
      return 'Very high risk tolerance, willing to lose entire investment'
    default:
      return 'Moderate risk tolerance'
  }
}
