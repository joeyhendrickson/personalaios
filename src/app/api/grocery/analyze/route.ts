import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting receipt analysis for user:', user.id)

    // Parse form data
    const formData = await request.formData()
    const receiptFile = formData.get('receipt') as File
    const zipCode = formData.get('zipCode') as string

    console.log('Received zip code:', zipCode)
    console.log(
      'Received file:',
      receiptFile?.name,
      'Type:',
      receiptFile?.type,
      'Size:',
      receiptFile?.size
    )

    if (!receiptFile || !zipCode) {
      return NextResponse.json({ error: 'Receipt file and zip code are required' }, { status: 400 })
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    console.log('Using AI SDK with gpt-4.1-mini model')

    // Convert file to base64 for OpenAI Vision API
    console.log('Converting file to base64...')
    const bytes = await receiptFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    const mimeType = receiptFile.type || 'image/jpeg'
    console.log('Image converted, size:', base64Image.length, 'bytes')

    // Step 1: Extract receipt data using GPT-4 Vision
    console.log('Calling OpenAI Vision API to extract receipt data...')

    const extractionPrompt = `Extract all items from this grocery receipt. For each item, provide:
- Item name
- Price per unit
- Quantity purchased
- Total price for that line item

Return ONLY a valid JSON array with this exact structure:
[
  {
    "item": "item name",
    "price": 0.00,
    "quantity": 1,
    "total": 0.00
  }
]

Be precise with numbers. If quantity is not shown, assume 1. Return ONLY the JSON array, no other text.

Image (base64): data:${mimeType};base64,${base64Image}`

    const { text: receiptDataText } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: extractionPrompt.split('\n\n')[0] + '\n\n' + extractionPrompt.split('\n\n')[1],
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Image}`,
            },
          ],
        },
      ],
    })
    console.log('Extraction response received:', receiptDataText.substring(0, 200))
    let receiptItems

    try {
      // Try to parse the JSON directly
      receiptItems = JSON.parse(receiptDataText)
      console.log('Successfully parsed receipt data directly')
    } catch (e) {
      console.log('Direct JSON parse failed, trying to extract from markdown...')
      // If parsing fails, try to extract JSON from markdown code blocks
      const jsonMatch = receiptDataText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
      if (jsonMatch) {
        receiptItems = JSON.parse(jsonMatch[1])
        console.log('Extracted from markdown code block')
      } else {
        // Try to find JSON array in the text
        const arrayMatch = receiptDataText.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          receiptItems = JSON.parse(arrayMatch[0])
          console.log('Extracted JSON array from text')
        } else {
          console.error('Failed to parse receipt data:', receiptDataText)
          receiptItems = []
        }
      }
    }

    console.log('Extracted items count:', receiptItems?.length || 0)

    if (!Array.isArray(receiptItems) || receiptItems.length === 0) {
      console.error('No items extracted from receipt')
      return NextResponse.json(
        { error: 'Could not extract items from receipt. Please try a clearer image.' },
        { status: 400 }
      )
    }

    // Calculate total spending
    const totalCurrentSpending = receiptItems.reduce((sum, item) => sum + item.total, 0)
    console.log('Total current spending:', totalCurrentSpending)

    // Step 2: Get AI recommendations for alternatives and store
    console.log('Getting AI recommendations for alternatives and stores...')
    const analysisPrompt = `I have a grocery receipt from zip code ${zipCode} with these items:

${receiptItems.map((item: any) => `- ${item.item}: $${item.total.toFixed(2)}`).join('\n')}

Total spent: $${totalCurrentSpending.toFixed(2)}

Please provide:
1. Alternative products for EACH line item that would save money, based on realistic grocery store prices within 25 miles of zip code ${zipCode}. Consider stores like Walmart, Aldi, Costco, Sam's Club, Kroger, Safeway, Target, etc.
2. Recommend which specific store would offer the best overall savings for this shopping trip
3. Calculate total potential savings

Return ONLY valid JSON with this EXACT structure (no markdown, no code blocks):
{
  "alternatives": [
    {
      "item": "original item name",
      "currentPrice": 0.00,
      "alternativeProduct": "cheaper alternative product name",
      "alternativePrice": 0.00,
      "savings": 0.00,
      "store": "store name"
    }
  ],
  "storeRecommendation": {
    "storeName": "Recommended Store Name",
    "address": "123 Street, City, State",
    "distance": 0.0,
    "totalSavings": 0.00,
    "savingsPercentage": 0.0
  }
}

Be realistic with prices and savings. Base recommendations on actual store locations and prices typical for that area.`

    const { text: analysisText } = await generateText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are a grocery shopping expert who helps people save money by finding better deals at different stores. Provide realistic price comparisons based on actual store chains and typical prices. Return ONLY valid JSON, no markdown formatting.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    })
    console.log('Analysis response received:', analysisText.substring(0, 200))
    let analysis

    try {
      analysis = JSON.parse(analysisText)
      console.log('Successfully parsed analysis JSON')
    } catch (e) {
      console.error('Failed to parse analysis:', analysisText)
      console.error('Parse error:', e)
      return NextResponse.json(
        { error: 'Failed to analyze receipt. Please try again.' },
        { status: 500 }
      )
    }

    // Calculate total potential savings
    const totalPotentialSavings =
      analysis.alternatives?.reduce((sum: number, alt: any) => sum + alt.savings, 0) || 0

    // Prepare response
    const result = {
      receipt: receiptItems,
      alternatives: analysis.alternatives || [],
      storeRecommendation: analysis.storeRecommendation || {
        storeName: 'No recommendation available',
        address: '',
        distance: 0,
        totalSavings: totalPotentialSavings,
        savingsPercentage:
          totalCurrentSpending > 0 ? (totalPotentialSavings / totalCurrentSpending) * 100 : 0,
      },
      totalCurrentSpending,
      totalPotentialSavings,
    }

    // Store the analysis in database for history
    console.log('Saving analysis to database...')
    const { error: dbError } = await supabase.from('grocery_analyses').insert({
      user_id: user.id,
      zip_code: zipCode,
      total_spending: totalCurrentSpending,
      total_savings: totalPotentialSavings,
      recommended_store: analysis.storeRecommendation?.storeName,
      analysis_data: result,
    })

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue even if database save fails
    } else {
      console.log('Analysis saved to database successfully')
    }

    console.log('Returning result to client')
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing receipt:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to analyze receipt. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
