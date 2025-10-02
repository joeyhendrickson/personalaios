import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const saveAnalysisSchema = z.object({
  name: z.string().min(1, 'Analysis name is required'),
  stockSymbol: z.string().min(1, 'Stock symbol is required'),
  buyingPower: z.number().min(100, 'Buying power must be at least $100'),
  investorType: z.enum(['long_term', 'scalper', 'options_trader', 'gambler']),
  informationSources: z
    .array(
      z.object({
        name: z.string(),
        weight: z.number().min(0).max(100),
      })
    )
    .default([]),
  eventMonitoring: z.object({
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
  }),
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
      sources: z.array(z.any()).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = saveAnalysisSchema.parse(body)

    // Save to database
    const { data, error } = await supabase
      .from('trading_analyses')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        stock_symbol: validatedData.stockSymbol,
        buying_power: validatedData.buyingPower,
        investor_type: validatedData.investorType,
        information_sources: validatedData.informationSources,
        event_monitoring: validatedData.eventMonitoring,
        manual_stock_data: validatedData.manualStockData || {},
        analysis_results: validatedData.analysisResults || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving analysis:', error)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analysis: data,
      message: 'Analysis saved successfully',
    })
  } catch (error) {
    console.error('Error in save-analysis API:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
