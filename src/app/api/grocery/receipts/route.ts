import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's grocery receipts
    const { data: receipts, error } = await supabase
      .from('grocery_receipts')
      .select(
        `
        *,
        grocery_items (*),
        receipt_analysis (*)
      `
      )
      .eq('user_id', user.id)
      .order('receipt_date', { ascending: false })

    if (error) {
      console.error('Error fetching grocery receipts:', error)
      return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 })
    }

    return NextResponse.json({ receipts: receipts || [] })
  } catch (error) {
    console.error('Error in grocery receipts GET:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch grocery receipts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { store_name, store_location, zipcode, receipt_date, total_amount, receipt_text, items } =
      body

    if (!store_name || !zipcode || !receipt_date || !total_amount) {
      return NextResponse.json(
        {
          error: 'Missing required fields: store_name, zipcode, receipt_date, total_amount',
        },
        { status: 400 }
      )
    }

    console.log(`Creating grocery receipt for user: ${user.id}`)
    console.log(`Store: ${store_name}, Total: $${total_amount}, Items: ${items?.length || 0}`)

    // Create the receipt
    const { data: receipt, error: receiptError } = await supabase
      .from('grocery_receipts')
      .insert({
        user_id: user.id,
        store_name,
        store_location,
        zipcode,
        receipt_date,
        total_amount,
        receipt_text,
        is_processed: false,
      })
      .select()
      .single()

    if (receiptError) {
      console.error('Error creating grocery receipt:', receiptError)
      return NextResponse.json({ error: 'Failed to create receipt' }, { status: 500 })
    }

    // Add items if provided
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        receipt_id: receipt.id,
        item_name: item.item_name,
        item_category: item.item_category,
        brand: item.brand,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        is_organic: item.is_organic || false,
        is_generic: item.is_generic || false,
      }))

      const { error: itemsError } = await supabase.from('grocery_items').insert(itemsToInsert)

      if (itemsError) {
        console.error('Error adding grocery items:', itemsError)
        // Don't fail the whole request if items fail
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      activity_type: 'grocery_receipt_uploaded',
      description: `Uploaded grocery receipt from ${store_name} for $${total_amount}`,
      metadata: {
        store_name,
        total_amount,
        item_count: items?.length || 0,
        zipcode,
      },
    })

    return NextResponse.json({
      success: true,
      receipt: {
        ...receipt,
        items: items || [],
      },
    })
  } catch (error) {
    console.error('Error in grocery receipts POST:', error)
    return NextResponse.json(
      {
        error: 'Failed to create grocery receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
