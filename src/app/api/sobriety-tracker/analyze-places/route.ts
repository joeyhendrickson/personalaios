import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { env } from '@/lib/env'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAfterVercelSdkCall } from '@/lib/ai/usage-logger'
import { fetchBudgetContextData } from '@/lib/ai-context/fetch-user-data'
import {
  classifyDrinkingPlace,
  groupPlaceMatches,
  type PlaceMatch,
  type TransactionLike,
} from '@/lib/sobriety/bar-detection'
import type { BarCandidate } from '@/lib/sobriety/types'

const aiPlaceSchema = z.object({
  places: z.array(
    z.object({
      merchant_name: z.string(),
      likely_drinking_venue: z.boolean(),
      category: z.enum(['bar', 'restaurant', 'other']),
      reason: z.string(),
    })
  ),
})

function asTransactions(rows: Array<Record<string, unknown>>): TransactionLike[] {
  return rows.map((row) => ({
    id: typeof row.id === 'string' ? row.id : null,
    date: typeof row.date === 'string' ? row.date : null,
    name: typeof row.name === 'string' ? row.name : null,
    merchant_name: typeof row.merchant_name === 'string' ? row.merchant_name : null,
    category: (row.category as TransactionLike['category']) ?? null,
    amount: typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0,
  }))
}

function extractCachedMerchants(payload: unknown): TransactionLike[] {
  const found: TransactionLike[] = []
  const visit = (value: unknown, depth = 0) => {
    if (depth > 6 || value == null) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1)
      return
    }
    if (typeof value !== 'object') return
    const row = value as Record<string, unknown>
    const label =
      (typeof row.merchant_name === 'string' && row.merchant_name) ||
      (typeof row.label === 'string' && row.label) ||
      (typeof row.name === 'string' && row.name) ||
      (typeof row.merchant === 'string' && row.merchant) ||
      null
    if (label && (row.amount != null || row.total_abs != null || row.count != null || row.date)) {
      found.push({
        id: typeof row.id === 'string' ? row.id : null,
        date: typeof row.date === 'string' ? row.date : null,
        name: label,
        merchant_name: label,
        category: (row.category as TransactionLike['category']) ?? null,
        amount: Number(row.amount ?? row.total_abs ?? 0) || 0,
      })
    }
    for (const nested of Object.values(row)) {
      if (nested && typeof nested === 'object') visit(nested, depth + 1)
    }
  }
  visit(payload)
  return found
}

export async function POST() {
  const startMs = Date.now()
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    const budget = await fetchBudgetContextData(supabase, user.id, {
      lookbackDays: 120,
      transactionLimit: 800,
    })

    const liveTx = asTransactions(budget.transactions as unknown as Array<Record<string, unknown>>)

    const [{ data: analyses }, { data: cacheRow }] = await Promise.all([
      supabase
        .from('budget_analyses')
        .select('analysis_data, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('user_context_cache')
        .select('module_context_summary_json')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const cachedFromAnalyses = (analyses || []).flatMap((row) =>
      extractCachedMerchants(row.analysis_data)
    )
    const cachedFromAdvisor = extractCachedMerchants(cacheRow?.module_context_summary_json)
    const cachedFromRollups: TransactionLike[] = (budget.merchantRollups || []).map((m) => ({
      merchant_name: m.label,
      name: m.label,
      amount: m.total_abs,
      category: null,
    }))
    const cachedFromVerified: TransactionLike[] = (budget.verifiedPeriods || []).flatMap((period) =>
      (period.top_merchants_or_names || []).map((m) => ({
        merchant_name: m.label,
        name: m.label,
        amount: m.total_abs,
        category: null,
      }))
    )

    const liveMatches = liveTx.map(classifyDrinkingPlace).filter((m): m is PlaceMatch => Boolean(m))
    const cachedMatches = [
      ...cachedFromAnalyses,
      ...cachedFromAdvisor,
      ...cachedFromRollups,
      ...cachedFromVerified,
    ]
      .map(classifyDrinkingPlace)
      .filter((m): m is PlaceMatch => Boolean(m))

    const liveGrouped = groupPlaceMatches(liveMatches)
    const cachedGrouped = groupPlaceMatches(cachedMatches)

    const byName = new Map<string, BarCandidate>()
    for (const row of liveGrouped) {
      byName.set(row.merchant_name.toLowerCase(), { ...row, source: 'live' })
    }
    for (const row of cachedGrouped) {
      const key = row.merchant_name.toLowerCase()
      const existing = byName.get(key)
      if (!existing) {
        byName.set(key, { ...row, source: 'cached' })
        continue
      }
      byName.set(key, {
        ...existing,
        visit_count: Math.max(existing.visit_count, row.visit_count),
        total_spend: Math.max(existing.total_spend, row.total_spend),
        last_seen_date: existing.last_seen_date || row.last_seen_date,
        sample_dates: [...new Set([...existing.sample_dates, ...row.sample_dates])].slice(0, 8),
        transaction_ids: [...new Set([...existing.transaction_ids, ...row.transaction_ids])],
        source: 'both',
      })
    }

    let candidates = [...byName.values()].sort((a, b) => {
      if (a.category === 'bar' && b.category !== 'bar') return -1
      if (b.category === 'bar' && a.category !== 'bar') return 1
      return b.visit_count - a.visit_count
    })

    if (env.OPENAI_API_KEY && candidates.length) {
      try {
        const result = await generateObject({
          model: defaultOpenaiModel(),
          schema: aiPlaceSchema,
          prompt: `You help a user honestly track possible drinking venues from Budget Master merchants.
Do not invent places. Only comment on the merchants listed.
Mark likely_drinking_venue true for bars, pubs, nightlife, liquor, or restaurants where alcohol is commonly the point of the visit.
Be conservative with grocery, coffee, fast food, and retail.

Merchants:
${candidates
  .slice(0, 40)
  .map(
    (c) =>
      `- ${c.merchant_name} (${c.category}, ${c.visit_count} visits, $${c.total_spend}, ${c.source})`
  )
  .join('\n')}`,
        })

        await logAfterVercelSdkCall({
          startMs,
          userId,
          module: 'sobriety-tracker',
          action: 'analyze-places',
          route: '/api/sobriety-tracker/analyze-places',
          model: resolveOpenAIModelId(),
          description: 'Scan Budget Master transactions for possible drinking venues',
          result,
        })

        const aiByName = new Map(
          result.object.places.map((p) => [p.merchant_name.toLowerCase(), p])
        )
        candidates = candidates
          .map((c) => {
            const ai = aiByName.get(c.merchant_name.toLowerCase())
            if (!ai) return c
            const confidence: BarCandidate['confidence'] = ai.likely_drinking_venue
              ? c.category === 'bar'
                ? 'high'
                : 'medium'
              : 'low'
            return {
              ...c,
              category: ai.category,
              reason: ai.reason || c.reason,
              confidence,
            }
          })
          .filter((c) => {
            const ai = aiByName.get(c.merchant_name.toLowerCase())
            if (!ai) return c.category === 'bar' || c.confidence !== 'low'
            return ai.likely_drinking_venue || c.category === 'bar'
          })
      } catch (aiError) {
        await logAfterVercelSdkCall({
          startMs,
          userId,
          module: 'sobriety-tracker',
          action: 'analyze-places',
          route: '/api/sobriety-tracker/analyze-places',
          model: resolveOpenAIModelId(),
          description: 'Scan Budget Master transactions for possible drinking venues',
          status: 'error',
          error: aiError instanceof Error ? aiError.message : 'AI analysis failed',
        })
      }
    }

    return NextResponse.json({
      candidates,
      liveTransactionCount: liveTx.length,
      cachedMerchantCount:
        cachedFromAnalyses.length + cachedFromRollups.length + cachedFromVerified.length,
      lookbackDays: 120,
      success: true,
    })
  } catch (error) {
    if (userId) {
      await logAfterVercelSdkCall({
        startMs,
        userId,
        module: 'sobriety-tracker',
        action: 'analyze-places',
        route: '/api/sobriety-tracker/analyze-places',
        model: resolveOpenAIModelId(),
        description: 'Scan Budget Master transactions for possible drinking venues',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    console.error('Sobriety place analysis failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze Budget Master transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
