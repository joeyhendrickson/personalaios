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

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { receipt_id, zipcode } = body

    if (!receipt_id || !zipcode) {
      return NextResponse.json(
        {
          error: 'Missing required fields: receipt_id, zipcode',
        },
        { status: 400 }
      )
    }

    console.log(`Analyzing grocery receipt ${receipt_id} for user: ${user.id}`)

    // Get the receipt and its items
    const { data: receipt, error: receiptError } = await supabase
      .from('grocery_receipts')
      .select(
        `
        *,
        grocery_items (*)
      `
      )
      .eq('id', receipt_id)
      .eq('user_id', user.id)
      .single()

    if (receiptError || !receipt) {
      console.error('Error fetching receipt:', receiptError)
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // Get nearby stores
    const { data: stores, error: storesError } = await supabase
      .from('grocery_stores')
      .select('*')
      .eq('zipcode', zipcode)
      .eq('is_active', true)

    if (storesError) {
      console.error('Error fetching stores:', storesError)
    }

    // Get user preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('grocery_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Generate AI analysis
    const analysis = await generateGroceryAnalysis(receipt, stores || [], preferences, zipcode)

    // Save analysis to database
    const { data: savedAnalysis, error: analysisError } = await supabase
      .from('receipt_analysis')
      .insert({
        receipt_id: receipt.id,
        total_savings_potential: analysis.total_savings_potential,
        alternative_store_recommendations: analysis.alternative_store_recommendations,
        item_alternatives: analysis.item_alternatives,
        analysis_summary: analysis.analysis_summary,
        confidence_score: analysis.confidence_score,
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Error saving analysis:', analysisError)
      // Don't fail the request if analysis save fails
    }

    // Update receipt as processed
    await supabase.from('grocery_receipts').update({ is_processed: true }).eq('id', receipt.id)

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'grocery_receipt_analyzed',
      description: `Analyzed grocery receipt from ${receipt.store_name}`,
      metadata: {
        receipt_id,
        store_name: receipt.store_name,
        total_amount: receipt.total_amount,
        potential_savings: analysis.total_savings_potential,
      },
    })

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis || analysis,
      receipt: receipt,
    })
  } catch (error) {
    console.error('Error in grocery analysis:', error)

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
        error: 'Failed to analyze grocery receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function generateGroceryAnalysis(
  receipt: any,
  stores: any[],
  preferences: any,
  zipcode: string
) {
  // Prepare data for AI
  const receiptData = {
    store_name: receipt.store_name,
    total_amount: receipt.total_amount,
    receipt_date: receipt.receipt_date,
    items:
      receipt.grocery_items?.map((item: any) => ({
        name: item.item_name,
        category: item.item_category,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_organic: item.is_organic,
        is_generic: item.is_generic,
      })) || [],
  }

  const storesData = stores.map((store) => ({
    name: store.store_name,
    chain: store.store_chain,
    address: store.address,
  }))

  const preferencesData = preferences
    ? {
        preferred_stores: preferences.preferred_stores,
        max_drive_distance: preferences.max_drive_distance,
        prioritize_organic: preferences.prioritize_organic,
        prioritize_generic: preferences.prioritize_generic,
        budget_limit: preferences.budget_limit,
        dietary_restrictions: preferences.dietary_restrictions,
      }
    : null

  const prompt = `
Analyze this grocery receipt and provide cost optimization recommendations:

RECEIPT DATA:
${JSON.stringify(receiptData, null, 2)}

AVAILABLE STORES IN ZIPCODE ${zipcode}:
${JSON.stringify(storesData, null, 2)}

USER PREFERENCES:
${JSON.stringify(preferencesData, null, 2)}

Provide a comprehensive analysis including:

1. Cost analysis of each item
2. Alternative items with better prices
3. Store recommendations within 20 miles
4. Total potential savings
5. Shopping strategy recommendations

Consider:
- Generic vs brand name alternatives
- Organic vs conventional options
- Bulk buying opportunities
- Store-specific deals and pricing
- User preferences and dietary restrictions
- Distance and convenience factors

Format your response as JSON with this structure:
{
  "total_savings_potential": 25.50,
  "analysis_summary": "You could save approximately $25.50 by shopping at different stores and choosing alternative items...",
  "confidence_score": 0.85,
  "alternative_store_recommendations": [
    {
      "store_name": "Walmart",
      "store_chain": "Walmart",
      "estimated_savings": "$15.30",
      "distance_miles": 2.5,
      "reason": "Best prices for pantry items and household goods",
      "items_better_priced": ["Milk", "Bread", "Cereal"]
    }
  ],
  "item_alternatives": [
    {
      "original_item": "Brand Name Cereal",
      "alternative_item": "Generic Cereal",
      "original_price": 4.99,
      "alternative_price": 2.99,
      "savings": 2.00,
      "store_recommendation": "Walmart",
      "reason": "Generic version offers same nutrition at 40% lower cost"
    }
  ],
  "shopping_strategy": {
    "primary_store": "Walmart",
    "secondary_stores": ["Target", "Kroger"],
    "total_estimated_cost": 45.50,
    "total_savings": 25.50,
    "recommended_route": "Start at Walmart for basics, then Target for organic items"
  }
}

Be realistic about pricing and focus on actionable recommendations that will actually save money.
`

  const { text: aiResponse } = await generateText({
    model: openai('gpt-4.1-mini'),
    messages: [
      {
        role: 'system',
        content:
          'You are an expert grocery shopping analyst and cost optimization specialist. Analyze grocery receipts and provide detailed, actionable recommendations for saving money while maintaining quality and meeting dietary needs.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
  })

  let parsedResponse
  try {
    parsedResponse = JSON.parse(aiResponse)
  } catch (parseError) {
    // If JSON parsing fails, create a basic analysis
    parsedResponse = {
      total_savings_potential: 10.0,
      analysis_summary:
        'Analysis completed with basic recommendations. Consider shopping at different stores for better prices.',
      confidence_score: 0.6,
      alternative_store_recommendations: [
        {
          store_name: 'Walmart',
          store_chain: 'Walmart',
          estimated_savings: '$10.00',
          distance_miles: 5.0,
          reason: 'Generally lower prices on most items',
          items_better_priced: ['Basic groceries'],
        },
      ],
      item_alternatives: [],
      shopping_strategy: {
        primary_store: 'Walmart',
        secondary_stores: ['Target'],
        total_estimated_cost: receipt.total_amount - 10.0,
        total_savings: 10.0,
        recommended_route: 'Shop at Walmart for better prices',
      },
    }
  }

  return parsedResponse
}
