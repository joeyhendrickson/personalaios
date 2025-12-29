import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhook_type, webhook_code, item_id, ...webhookData } = body

    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id })

    const supabase = await createClient()

    // Find the bank connection by item_id
    const { data: bankConnection, error: connectionError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('item_id', item_id)
      .single()

    if (connectionError || !bankConnection) {
      console.error('Bank connection not found for item_id:', item_id)
      // Return 200 to acknowledge webhook even if connection not found
      // (prevents Plaid from retrying)
      return NextResponse.json({ received: true })
    }

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(supabase, bankConnection.id, webhook_code, webhookData)
        break

      case 'ITEM':
        await handleItemWebhook(supabase, bankConnection.id, webhook_code, webhookData)
        break

      case 'AUTH':
        await handleAuthWebhook(supabase, bankConnection.id, webhook_code, webhookData)
        break

      default:
        console.log('Unhandled webhook type:', webhook_type)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Plaid webhook:', error)
    // Return 200 to prevent Plaid from retrying on unexpected errors
    // (you may want to log these for debugging)
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}

async function handleTransactionsWebhook(
  supabase: any,
  bankConnectionId: string,
  webhookCode: string,
  webhookData: any
) {
  console.log('Processing TRANSACTIONS webhook:', webhookCode)

  switch (webhookCode) {
    case 'SYNC_UPDATES_AVAILABLE':
      // New transactions are available, trigger a sync
      console.log('New transactions available for connection:', bankConnectionId)
      // You could trigger an async sync here or queue it
      // For now, we'll just log it - the user can manually sync
      break

    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // Initial or historical transactions loaded
      console.log('Transaction update completed:', webhookCode)
      break

    case 'DEFAULT_UPDATE':
      // Regular transaction updates
      console.log('Default transaction update received')
      break

    default:
      console.log('Unhandled transactions webhook code:', webhookCode)
  }
}

async function handleItemWebhook(
  supabase: any,
  bankConnectionId: string,
  webhookCode: string,
  webhookData: any
) {
  console.log('Processing ITEM webhook:', webhookCode)

  switch (webhookCode) {
    case 'ERROR':
      // Item has an error, update status
      await supabase
        .from('bank_connections')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankConnectionId)
      console.log('Bank connection marked as error:', bankConnectionId)
      break

    case 'PENDING_EXPIRATION':
      // Access token is expiring soon
      console.log('Access token expiring soon for connection:', bankConnectionId)
      // You may want to notify the user or refresh the token
      break

    case 'USER_PERMISSION_REVOKED':
      // User revoked access
      await supabase
        .from('bank_connections')
        .update({
          status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bankConnectionId)
      console.log('Bank connection disconnected by user:', bankConnectionId)
      break

    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      // Webhook URL was updated
      console.log('Webhook URL update acknowledged')
      break

    default:
      console.log('Unhandled item webhook code:', webhookCode)
  }
}

async function handleAuthWebhook(
  supabase: any,
  bankConnectionId: string,
  webhookCode: string,
  webhookData: any
) {
  console.log('Processing AUTH webhook:', webhookCode)

  switch (webhookCode) {
    case 'AUTOMATICALLY_VERIFIED':
      // Account was automatically verified
      console.log('Account automatically verified:', bankConnectionId)
      break

    case 'VERIFICATION_EXPIRED':
      // Verification expired
      console.log('Verification expired:', bankConnectionId)
      break

    default:
      console.log('Unhandled auth webhook code:', webhookCode)
  }
}
