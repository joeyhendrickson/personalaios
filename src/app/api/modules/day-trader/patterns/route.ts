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
    console.log('Pattern analysis request body:', body)
    const { stockSymbol, investorType, informationSources, eventMonitoring } = body

    if (!stockSymbol) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
    }

    // Get current date and time context
    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' })
    const isMarketOpen =
      new Date().getHours() >= 9 &&
      new Date().getHours() < 16 &&
      new Date().getDay() >= 1 &&
      new Date().getDay() <= 5

    // Get real-time stock data using our new service
    let stockData = null
    try {
      const { StockDataService } = await import('@/lib/stock-data')
      stockData = await StockDataService.getStockData(stockSymbol)

      if (!stockData) {
        console.error('All stock data sources failed')
        stockData = {
          symbol: stockSymbol,
          latestPrice: null,
          error: 'Unable to fetch real-time data from available sources',
        }
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
      stockData = {
        symbol: stockSymbol,
        latestPrice: null,
        error: 'Data fetch failed',
      }
    }

    // Create AI prompt for real-time pattern analysis
    const prompt = `
You are an expert day trading analyst with access to real-time market data. Analyze ${stockSymbol} stock for actual trading patterns and provide real market insights.

REAL-TIME MARKET DATA:
${
  stockData && stockData.latestPrice
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
- WARNING: Unable to fetch real-time data from available sources
- Error: ${(stockData as any)?.error || 'Data unavailable'}
- IMPORTANT: You must clearly state that this analysis is based on general market knowledge and NOT real-time data
- You must NOT make up specific price levels or patterns
- You must explain that users should verify current prices independently
`
}

CURRENT MARKET CONTEXT:
- Today's Date: ${currentDate} at ${currentTime} EST
- Market Status: ${isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}

INVESTOR PROFILE:
- Type: ${investorType}
- Investment Focus: ${getInvestorFocus(investorType)}

INFORMATION SOURCES (with weights):
${informationSources.map((source: any) => `- ${source.name} (${source.type}): ${source.weight}% weight`).join('\n')}

EVENT MONITORING:
${Object.entries(eventMonitoring)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

Please analyze ${stockSymbol} and provide REAL-TIME TRADING INSIGHTS focusing on these specific day trading patterns from the last day of trading:

1. CONSOLIDATION PATTERNS (Primary Focus):
   - Bullish/Bearish Flags: Look for initial trend followed by brief consolidation and continuation
   - Bullish/Bearish Pennants: Sideways consolidation after initial trend
   - Ascending Triangles: Flat resistance with higher lows
   - Descending Triangles: Flat support with lower highs  
   - Symmetrical Triangles: Constricting price range

2. STRUCTURAL PATTERNS:
   - Double Tops/Bottoms: Two equal highs/lows with rejection
   - Head & Shoulders: Three peaks with middle peak highest
   - Inverse Head & Shoulders: Three valleys with middle valley lowest

3. CANDLESTICK PATTERNS:
   - Pin Bars: Long wicks showing rejection
   - Inside Bars: Consolidation within previous bar's range
   - Engulfing Patterns: Bullish/bearish engulfing candles

4. TECHNICAL ANALYSIS:
   - RSI levels and momentum
   - Volume analysis during pattern formation
   - Support/resistance levels
   - Breakout confirmation signals

5. PATTERN STATUS & TARGETS:
   - Current pattern development stage
   - Entry/exit levels
   - Price targets based on pattern measurements
   - Risk/reward ratios

Focus on patterns that have formed in the last 24 hours of trading with real price levels and volume data.

Format your response as JSON with this structure:
{
  "patterns": [
    {
      "name": "Pattern Name",
      "description": "Detailed description of the actual pattern forming",
      "confidence": 85,
      "timeframe": "Daily/Weekly/4-Hour",
      "implications": "What this means for price direction",
      "chartLocation": "Specific date range and price levels where pattern exists",
      "currentStatus": "developing/confirmed/completed",
      "keyLevels": ["Specific price points that define the pattern"]
    }
  ],
  "technicalIndicators": {
    "rsi": "Current RSI level and interpretation",
    "macd": "MACD signal analysis",
    "volume": "Volume analysis and significance",
    "movingAverages": "Key MA levels and trends"
  },
  "supportResistance": {
    "support": ["Key support levels"],
    "resistance": ["Key resistance levels"]
  },
  "sentiment": "Current market sentiment for this stock",
  "riskLevel": "low/medium/high",
  "recommendations": ["Specific trading recommendations for this investor type"],
  "intradayAnalysis": "Current intraday patterns and momentum"
}

Provide REAL market analysis based on actual data for ${stockSymbol}.
`

    // Use the same model as the chatbot (gpt-4o-mini)
    const { text: analysis } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are an expert day trading analyst with deep knowledge of technical analysis, chart patterns, and market psychology. Provide detailed, actionable trading insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })
    if (!analysis) {
      return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
    }

    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysis)
    } catch (parseError) {
      // If JSON parsing fails, return the raw analysis
      parsedAnalysis = {
        patterns: [
          {
            name: 'AI Analysis Complete',
            description: analysis,
            confidence: 75,
            timeframe: 'Current',
            implications: 'AI has analyzed the stock based on your configuration',
          },
        ],
        technicalIndicators: {
          rsi: 'Analysis provided in patterns',
          macd: 'See detailed analysis above',
          volume: 'Volume considerations included',
          movingAverages: 'MA analysis provided',
        },
        supportResistance: {
          support: ['See analysis above'],
          resistance: ['See analysis above'],
        },
        sentiment: 'Based on your information sources',
        riskLevel: 'medium',
        recommendations: ['Review the detailed analysis above for specific recommendations'],
      }
    }

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in pattern analysis:', error)

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

    // Check for model access errors
    if (
      error instanceof Error &&
      (error.message.includes('does not have access') || error.message.includes('model_not_found'))
    ) {
      return NextResponse.json(
        {
          error: 'Model access error',
          details: `Your OpenAI account doesn't have access to the requested model. Error: ${error.message}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze trading patterns',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function getInvestorFocus(type: string): string {
  switch (type) {
    case 'long_term':
      return 'Long-term value investing with 3+ month holding periods'
    case 'scalper':
      return 'Short-term momentum trading with quick entries and exits'
    case 'options_trader':
      return 'Options trading with calls and puts, focusing on theta and volatility'
    case 'gambler':
      return 'High-risk, high-reward trading with short-term options'
    default:
      return 'General trading approach'
  }
}
