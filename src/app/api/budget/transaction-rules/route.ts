import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { env } from '@/lib/env'

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

    const body = await request.json()
    const { user_prompt, transaction_sample } = body

    if (!user_prompt) {
      return NextResponse.json({ error: 'User prompt is required' }, { status: 400 })
    }

    // Get user's transaction categorization rules/preferences (if stored)
    // For now, we'll generate a response based on the user's prompt
    const systemPrompt = `You are a financial transaction categorization assistant. 
Your role is to help users define rules for categorizing and displaying their bank transactions.

Based on user input, provide:
1. Clear categorization rules (which transactions should be marked as income, expense, or transfer)
2. Color coding rules (when to use red/green/grey)
3. Arrow direction rules (when to use up/down arrows)
4. Account-type specific rules (credit cards vs debit/checking accounts)

Key principles:
- Credit cards: Positive amounts = expenses (RED, down arrow), Negative amounts = income/credits (GREEN, up arrow)
- Debit/Checking/PayPal: Positive amounts = income (GREEN, up arrow), Negative amounts = expenses (RED, down arrow)
- Money transfers between accounts = GREY
- "Payment from" transactions = Income (GREEN, up arrow)
- "Payment to" transactions = Expenses (RED, down arrow)

Respond with clear, actionable rules that can be applied to transaction categorization.`

    const userMessage = transaction_sample
      ? `${user_prompt}

Sample transaction data:
${JSON.stringify(transaction_sample, null, 2)}

Please provide specific rules for this type of transaction.`
      : user_prompt

    const { text: aiResponse } = await generateText({
      model: openai(env.OPENAI_MODEL || 'gpt-4.1-mini'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      rules: aiResponse,
      summary: 'Transaction categorization rules generated based on your input',
    })
  } catch (error: any) {
    console.error('Error generating transaction rules:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate transaction rules',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
