# Plaid Webhook Setup Guide

## Current Webhook Configuration

Your webhook endpoint is located at:

```
https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook
```

## Step 1: Verify Webhook Endpoint is Accessible

1. **Test the webhook endpoint**:
   - Visit: `https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook/test`
   - Should return: `{"status":"ok","message":"Webhook endpoint is accessible"}`

2. **If the test fails**, check:
   - The route exists: `src/app/api/modules/budget-optimizer/plaid/webhook/route.ts`
   - The deployment is live
   - No routing issues

## Step 2: Configure Webhook in Vercel

Set these environment variables in Vercel:

1. **Option A: Set webhook URL directly** (Recommended)

   ```
   PLAID_WEBHOOK_URL=https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook
   ```

2. **Option B: Set NEXTAUTH_URL** (will auto-construct webhook)
   ```
   NEXTAUTH_URL=https://lifestacks.ai
   ```

## Step 3: Configure Webhook in Plaid Dashboard

**Important**: You need to register the webhook URL in Plaid's dashboard for it to work.

### For Production:

1. **Log into Plaid Dashboard**: https://dashboard.plaid.com/
2. **Go to**: Team Settings → Webhooks (or API → Webhooks)
3. **Add Webhook URL**:
   ```
   https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook
   ```
4. **Select Webhook Events** (recommended):
   - ✅ `TRANSACTIONS` - Transaction updates
   - ✅ `ITEM` - Item status changes (errors, disconnections)
   - ✅ `AUTH` - Authentication events (optional)

5. **Save the webhook configuration**

### For Sandbox (Testing):

1. **Switch to Sandbox environment** in Plaid Dashboard
2. **Repeat the same steps** above with your sandbox webhook URL
3. **Test with sandbox credentials** first

## Step 4: Verify Webhook is Working

### Check Vercel Logs:

After connecting a bank account, check Vercel Function Logs for:

- `"Plaid webhook received:"` - Confirms webhook was received
- `"Processing TRANSACTIONS webhook:"` - Shows transaction events
- `"Processing ITEM webhook:"` - Shows item status changes

### Test Webhook Delivery:

1. **In Plaid Dashboard**:
   - Go to Webhooks section
   - Look for "Test Webhook" or "Send Test Event" option
   - Send a test webhook to verify delivery

2. **Check your Vercel logs** to see if the test webhook was received

## Step 5: Troubleshooting

### Webhook Not Receiving Events?

1. **Verify webhook URL in Plaid Dashboard**:
   - Must match exactly: `https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook`
   - No trailing slashes
   - Must be HTTPS (not HTTP) for production

2. **Check Vercel environment variables**:
   - `PLAID_WEBHOOK_URL` is set correctly, OR
   - `NEXTAUTH_URL` is set to `https://lifestacks.ai`

3. **Verify webhook is registered in Plaid**:
   - Go to Plaid Dashboard → Webhooks
   - Confirm your webhook URL is listed
   - Check if it's enabled/active

4. **Check Vercel Function Logs**:
   - Look for webhook POST requests
   - Check for any errors in webhook processing

### Common Issues:

- **Webhook URL mismatch**: URL in Plaid Dashboard must match exactly
- **HTTPS required**: Production webhooks must use HTTPS
- **Webhook not registered**: Must register in Plaid Dashboard, not just set in code
- **CORS issues**: Shouldn't be an issue for server-to-server, but verify

## Current Implementation

Your webhook handler (`src/app/api/modules/budget-optimizer/plaid/webhook/route.ts`) handles:

- ✅ `TRANSACTIONS` webhooks (transaction updates)
- ✅ `ITEM` webhooks (connection status changes)
- ✅ `AUTH` webhooks (authentication events)

The webhook automatically:

- Finds the bank connection by `item_id`
- Updates connection status on errors
- Triggers transaction syncs when new transactions are available

## Next Steps

1. ✅ Set `PLAID_WEBHOOK_URL` in Vercel (or ensure `NEXTAUTH_URL` is set)
2. ✅ Register webhook in Plaid Dashboard
3. ✅ Test webhook delivery from Plaid Dashboard
4. ✅ Monitor Vercel logs for webhook events
5. ✅ Connect a bank account and verify webhooks are received
