import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * GET handler for Plaid webhook validation
 * Plaid may send GET requests to validate the webhook endpoint
 * This endpoint must be publicly accessible (no auth required)
 */
export async function GET(request: NextRequest) {
  // Return 200 to indicate the endpoint is accessible
  // Plaid may use this to validate the webhook URL
  return NextResponse.json({
    status: 'ok',
    message: 'Plaid webhook endpoint is active',
    timestamp: new Date().toISOString(),
  })
}

/**
 * POST handler for Plaid webhook events
 * Plaid sends webhook events as POST requests with JSON body
 * This endpoint must be publicly accessible (no auth required)
 * Must always return 200 OK to acknowledge receipt
 */
export async function POST(request: NextRequest) {
  try {
    // Parse body - handle empty or malformed JSON gracefully
    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.warn('Failed to parse webhook body as JSON:', parseError)
      // Still return 200 to acknowledge receipt
      return NextResponse.json({ received: true, note: 'Body parsing failed' })
    }

    const { webhook_type, webhook_code, item_id, ...webhookData } = body

    // Log webhook receipt (item_id might be missing for some webhook types)
    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id })

    // If no item_id, we can't process it but still acknowledge
    if (!item_id) {
      console.warn('Webhook received without item_id:', { webhook_type, webhook_code })
      return NextResponse.json({ received: true, note: 'No item_id provided' })
    }

    // Create Supabase admin client - uses service role key, no user auth required
    // This is necessary because Plaid webhooks don't include user authentication
    const supabase = createAdminClient()

    // Find the bank connection by item_id
    const { data: bankConnection, error: connectionError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('item_id', item_id)
      .single()

    if (connectionError || !bankConnection) {
      console.warn('Bank connection not found for item_id:', item_id, connectionError?.message)
      // Return 200 to acknowledge webhook even if connection not found
      // (prevents Plaid from retrying)
      return NextResponse.json({ received: true, note: 'Connection not found' })
    }

    // Handle different webhook types asynchronously to respond quickly
    // Process webhook in background - don't await to ensure fast response
    processWebhookAsync(supabase, bankConnection.id, webhook_type, webhook_code, webhookData).catch(
      (error) => {
        console.error('Error in async webhook processing:', error)
      }
    )

    // Always return 200 immediately to acknowledge receipt
    // Plaid requires a quick response (< 5 seconds)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing Plaid webhook:', error)
    // Always return 200 to prevent Plaid from retrying on unexpected errors
    // Plaid will mark webhook as failed if we return non-200
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}

/**
 * Process webhook asynchronously to ensure fast response to Plaid
 * Uses admin client to access database without user authentication
 */
async function processWebhookAsync(
  supabase: ReturnType<typeof createAdminClient>,
  bankConnectionId: string,
  webhookType: string,
  webhookCode: string,
  webhookData: any
) {
  try {
    // Handle different webhook types
    switch (webhookType) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(supabase, bankConnectionId, webhookCode, webhookData)
        break

      case 'ITEM':
        await handleItemWebhook(supabase, bankConnectionId, webhookCode, webhookData)
        break

      case 'AUTH':
        await handleAuthWebhook(supabase, bankConnectionId, webhookCode, webhookData)
        break

      default:
        console.log('Unhandled webhook type:', webhookType)
    }
  } catch (error) {
    console.error(`Error handling ${webhookType} webhook:`, error)
    // Don't throw - we've already acknowledged receipt
  }
}

async function handleTransactionsWebhook(
  supabase: ReturnType<typeof createAdminClient>,
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
  supabase: ReturnType<typeof createAdminClient>,
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
  supabase: ReturnType<typeof createAdminClient>,
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
