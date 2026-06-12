import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeEventMonitoring } from '@/lib/day-trader/event-monitoring'
import { z } from 'zod'

const TABLE_MISSING_HINT =
  'The trading_analyses table is missing. Run migration 014_create_trading_analyses_table.sql in Supabase.'

const eventMonitoringSchema = z.object({
  earnings: z.boolean(),
  federalEvents: z.boolean(),
  tariffs: z.boolean(),
  rateCuts: z.boolean(),
  employment: z.boolean(),
  interestRates: z.boolean(),
  recession: z.boolean(),
  monetaryPolicy: z.boolean(),
  industryTrends: z.boolean(),
  analystRatings: z.boolean(),
})

const saveAnalysisSchema = z.object({
  name: z.string().trim().min(1, 'Analysis name is required'),
  stockSymbol: z
    .string()
    .trim()
    .min(1, 'Stock symbol is required')
    .max(10, 'Stock symbol is too long'),
  buyingPower: z.coerce.number().min(1, 'Buying power must be at least $1').max(1_000_000),
  investorType: z.enum(['long_term', 'scalper', 'options_trader']),
  informationSources: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        weight: z.coerce.number().min(0).max(100),
      })
    )
    .default([]),
  eventMonitoring: eventMonitoringSchema,
  manualStockData: z
    .object({
      currentPrice: z.string(),
      open: z.string(),
      high: z.string(),
      low: z.string(),
      volume: z.string(),
      previousClose: z.string(),
    })
    .optional(),
  analysisResults: z
    .object({
      patterns: z.array(z.any()).optional(),
      predictions: z.any().optional(),
      patternLookbackDays: z.number().optional(),
      sources: z.array(z.any()).optional(),
    })
    .optional(),
})

type TradingAnalysisInsert = {
  user_id: string
  name: string
  stock_symbol: string
  buying_power: number
  investor_type: string
  information_sources: Array<{ name: string; weight: number }>
  event_monitoring: z.infer<typeof eventMonitoringSchema>
  manual_stock_data: Record<string, string>
  analysis_results: Record<string, unknown>
}

async function insertTradingAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  record: TradingAnalysisInsert
) {
  let insertRes = await supabase.from('trading_analyses').insert(record).select().single()

  if (insertRes.error) {
    const code = insertRes.error.code
    const message = (insertRes.error.message || '').toLowerCase()

    if (code === '42P01' || message.includes('does not exist')) {
      return { data: null, error: insertRes.error, missingTable: true as const }
    }

    try {
      const { createAdminClient } = await import('@/lib/supabaseAdmin')
      const admin = createAdminClient()
      insertRes = await admin.from('trading_analyses').insert(record).select().single()
    } catch (adminErr) {
      console.error('[save-analysis] admin insert fallback failed:', adminErr)
    }
  }

  return {
    data: insertRes.data,
    error: insertRes.error,
    missingTable: false as const,
  }
}

function formatZodDetails(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ')
}

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

    const body = await request.json().catch(() => ({}))
    const normalizedBody = {
      ...body,
      name: typeof body?.name === 'string' ? body.name.trim() : body?.name,
      stockSymbol:
        typeof body?.stockSymbol === 'string'
          ? body.stockSymbol.trim().toUpperCase()
          : body?.stockSymbol,
      eventMonitoring: normalizeEventMonitoring(body?.eventMonitoring),
      informationSources: Array.isArray(body?.informationSources)
        ? body.informationSources.map((source: { name?: unknown; weight?: unknown }) => ({
            name: typeof source?.name === 'string' ? source.name.trim() : '',
            weight: source?.weight,
          }))
        : [],
    }

    const validatedData = saveAnalysisSchema.parse(normalizedBody)

    const record: TradingAnalysisInsert = {
      user_id: user.id,
      name: validatedData.name,
      stock_symbol: validatedData.stockSymbol,
      buying_power: validatedData.buyingPower,
      investor_type: validatedData.investorType,
      information_sources: validatedData.informationSources,
      event_monitoring: validatedData.eventMonitoring,
      manual_stock_data: validatedData.manualStockData ?? {},
      analysis_results: (validatedData.analysisResults ?? {}) as Record<string, unknown>,
    }

    const insertResult = await insertTradingAnalysis(supabase, record)

    if (insertResult.error || !insertResult.data) {
      console.error('Error saving analysis:', insertResult.error)
      if (insertResult.missingTable) {
        return NextResponse.json(
          { error: 'Failed to save analysis', details: TABLE_MISSING_HINT },
          { status: 500 }
        )
      }
      return NextResponse.json(
        {
          error: 'Failed to save analysis',
          details: insertResult.error?.message || 'Database insert failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: insertResult.data,
      message: 'Analysis saved successfully',
    })
  } catch (error) {
    console.error('Error in save-analysis API:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: formatZodDetails(error) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
