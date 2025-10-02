import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { z } from 'zod'

const chartGenerationSchema = z.object({
  stockSymbol: z.string().min(1),
  patternName: z.string().min(1),
  patternDescription: z.string().min(1),
  chartLocation: z.string().min(1),
  keyLevels: z.array(z.string()),
  timeframe: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = chartGenerationSchema.parse(body)
    const { stockSymbol, patternName, patternDescription, chartLocation, keyLevels, timeframe } =
      validatedData

    // Generate a custom SVG chart instead of using DALL-E
    const svgChart = generateTradingChartSVG({
      stockSymbol,
      patternName,
      chartLocation,
      keyLevels,
      timeframe,
    })

    // Convert SVG to data URL
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgChart).toString('base64')}`

    return NextResponse.json({
      success: true,
      imageUrl: svgDataUrl,
      patternName: patternName,
      stockSymbol: stockSymbol,
      timeframe: timeframe,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in chart generation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function generateTradingChartSVG({
  stockSymbol,
  patternName,
  chartLocation,
  keyLevels,
  timeframe,
}: {
  stockSymbol: string
  patternName: string
  chartLocation: string
  keyLevels: string[]
  timeframe: string
}): string {
  const width = 800
  const height = 400
  const margin = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Generate sample price data for the pattern
  const priceData = generateSamplePriceData(patternName)
  const minPrice = Math.min(...priceData.map((d) => d.low))
  const maxPrice = Math.max(...priceData.map((d) => d.high))
  const priceRange = maxPrice - minPrice

  // Scale functions
  const xScale = (index: number) => margin.left + (index / (priceData.length - 1)) * chartWidth
  const yScale = (price: number) => margin.top + ((maxPrice - price) / priceRange) * chartHeight

  // Generate candlesticks
  const candlesticks = priceData
    .map((candle, index) => {
      const x = xScale(index)
      const openY = yScale(candle.open)
      const closeY = yScale(candle.close)
      const highY = yScale(candle.high)
      const lowY = yScale(candle.low)
      const isGreen = candle.close > candle.open
      const color = isGreen ? '#10b981' : '#ef4444'

      return `
      <line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="${color}" stroke-width="1"/>
      <rect x="${x - 2}" y="${Math.min(openY, closeY)}" width="4" height="${Math.abs(closeY - openY)}" fill="${color}"/>
    `
    })
    .join('')

  // Generate pattern-specific annotations
  const patternAnnotations = generatePatternAnnotations(patternName, priceData, xScale, yScale)

  // Generate key level lines
  const keyLevelLines = keyLevels
    .map((level) => {
      const price = parseFloat(level.replace('$', ''))
      const y = yScale(price)
      return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#6366f1" stroke-width="2" stroke-dasharray="5,5" opacity="0.7"/>`
    })
    .join('')

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      
      <!-- Grid lines -->
      ${generateGridLines(width, height, margin, chartWidth, chartHeight)}
      
      <!-- Key level lines -->
      ${keyLevelLines}
      
      <!-- Candlesticks -->
      ${candlesticks}
      
      <!-- Pattern annotations -->
      ${patternAnnotations}
      
      <!-- Title -->
      <text x="${width / 2}" y="15" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1f2937">
        ${stockSymbol} - ${patternName} Pattern
      </text>
      
      <!-- Timeframe -->
      <text x="${width - margin.right}" y="${height - 10}" text-anchor="end" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        ${timeframe}
      </text>
      
      <!-- Y-axis labels -->
      ${generateYAxisLabels(minPrice, maxPrice, margin, chartHeight)}
      
      <!-- Pattern description -->
      <text x="${margin.left}" y="${height - 10}" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">
        ${chartLocation}
      </text>
    </svg>
  `
}

function generateSamplePriceData(patternName: string) {
  const basePrice = 180
  const data = []

  // Generate different patterns based on pattern name
  if (patternName.toLowerCase().includes('flag')) {
    // Bull flag pattern
    for (let i = 0; i < 20; i++) {
      const trend = i < 8 ? 1 : i < 15 ? 0 : 1 // Up, sideways, up
      const price = basePrice + i * 2 * trend + (Math.random() - 0.5) * 4
      data.push({
        open: price + (Math.random() - 0.5) * 2,
        high: price + Math.random() * 3,
        low: price - Math.random() * 3,
        close: price + (Math.random() - 0.5) * 2,
      })
    }
  } else if (patternName.toLowerCase().includes('triangle')) {
    // Triangle pattern
    for (let i = 0; i < 20; i++) {
      const volatility = 10 - i * 0.4 // Decreasing volatility
      const price = basePrice + (Math.random() - 0.5) * volatility
      data.push({
        open: price + (Math.random() - 0.5) * 2,
        high: price + Math.random() * 2,
        low: price - Math.random() * 2,
        close: price + (Math.random() - 0.5) * 2,
      })
    }
  } else {
    // Default pattern
    for (let i = 0; i < 20; i++) {
      const price = basePrice + (Math.random() - 0.5) * 10
      data.push({
        open: price + (Math.random() - 0.5) * 2,
        high: price + Math.random() * 3,
        low: price - Math.random() * 3,
        close: price + (Math.random() - 0.5) * 2,
      })
    }
  }

  return data
}

function generateGridLines(
  width: number,
  height: number,
  margin: any,
  chartWidth: number,
  chartHeight: number
) {
  const lines = []

  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = margin.top + (i / 5) * chartHeight
    lines.push(
      `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" opacity="0.5"/>`
    )
  }

  // Vertical grid lines
  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (i / 10) * chartWidth
    lines.push(
      `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" stroke="#e5e7eb" stroke-width="1" opacity="0.5"/>`
    )
  }

  return lines.join('')
}

function generateYAxisLabels(minPrice: number, maxPrice: number, margin: any, chartHeight: number) {
  const labels = []
  const priceRange = maxPrice - minPrice

  for (let i = 0; i <= 5; i++) {
    const price = minPrice + (i / 5) * priceRange
    const y = margin.top + (i / 5) * chartHeight
    labels.push(
      `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">$${price.toFixed(0)}</text>`
    )
  }

  return labels.join('')
}

function generatePatternAnnotations(
  patternName: string,
  priceData: any[],
  xScale: (val: number) => number,
  yScale: (val: number) => number
) {
  const annotations = []

  if (patternName.toLowerCase().includes('flag')) {
    // Add flagpole and flag annotations
    const flagpoleStart = xScale(0)
    const flagpoleEnd = xScale(7)
    const flagStart = xScale(8)
    const flagEnd = xScale(14)

    annotations.push(`
      <line x1="${flagpoleStart}" y1="${yScale(priceData[0].low)}" x2="${flagpoleEnd}" y2="${yScale(priceData[7].high)}" stroke="#3b82f6" stroke-width="3" opacity="0.8"/>
      <line x1="${flagStart}" y1="${yScale(priceData[8].high)}" x2="${flagEnd}" y2="${yScale(priceData[14].low)}" stroke="#3b82f6" stroke-width="2" opacity="0.8"/>
      <text x="${flagpoleStart + 20}" y="${yScale(priceData[0].low) - 10}" font-family="Arial, sans-serif" font-size="12" fill="#3b82f6" font-weight="bold">Flagpole</text>
      <text x="${flagStart + 20}" y="${yScale(priceData[8].high) - 10}" font-family="Arial, sans-serif" font-size="12" fill="#3b82f6" font-weight="bold">Flag</text>
    `)
  } else if (patternName.toLowerCase().includes('triangle')) {
    // Add triangle trend lines
    const topStart = xScale(0)
    const topEnd = xScale(19)
    const bottomStart = xScale(0)
    const bottomEnd = xScale(19)

    annotations.push(`
      <line x1="${topStart}" y1="${yScale(priceData[0].high)}" x2="${topEnd}" y2="${yScale(priceData[19].high)}" stroke="#8b5cf6" stroke-width="2" opacity="0.8"/>
      <line x1="${bottomStart}" y1="${yScale(priceData[0].low)}" x2="${bottomEnd}" y2="${yScale(priceData[19].low)}" stroke="#8b5cf6" stroke-width="2" opacity="0.8"/>
      <text x="${topStart + 20}" y="${yScale(priceData[0].high) - 10}" font-family="Arial, sans-serif" font-size="12" fill="#8b5cf6" font-weight="bold">Triangle</text>
    `)
  }

  return annotations.join('')
}
