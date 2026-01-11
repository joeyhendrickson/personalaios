# Plaid Production Setup - Quick Guide

## ✅ Schema Mismatch Fixed!

The schema mismatch issue has been fixed. The code now uses the correct column names (`access_token`, `item_id`) that match your database.

## Production Setup Steps

### 1. Update Environment Variables for Production

In your `.env.local` file (for local testing) and **Vercel** (for production), set:

```bash
# Plaid Production Configuration
PLAID_CLIENT_ID=your_production_client_id
PLAID_ENV=production
PLAID_SECRET_PRODUCTION=your_production_secret_key

# Token Encryption (REQUIRED - must be at least 32 characters)
TOKEN_ENCRYPTION_KEY=your_secure_32_char_minimum_key_here

# Production Webhook URL
PLAID_WEBHOOK_URL=https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook
# OR set NEXTAUTH_URL (webhook will be auto-constructed)
NEXTAUTH_URL=https://lifestacks.ai
```

**Important Notes:**

- ⚠️ **Use `PLAID_SECRET_PRODUCTION` NOT `PLAID_SECRET_SANDBOX`** for production
- Your Client ID is the same for sandbox and production
- The Secret is different for each environment
- `TOKEN_ENCRYPTION_KEY` must be the same across all environments if you want existing connections to work

### 2. Get Your Production Credentials

1. Go to [Plaid Dashboard](https://dashboard.plaid.com)
2. Make sure you're in **Production** environment (toggle in top right)
3. Navigate to **Team Settings** → **Keys**
4. Copy your **Production** credentials:
   - **Client ID** (Production) - Same as sandbox
   - **Secret** (Production) - Different from sandbox!

### 3. Set Up Production Webhook (Optional but Recommended)

1. In Plaid Dashboard → **Team Settings** → **Webhooks**
2. Add your production webhook URL:
   ```
   https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook
   ```
3. Select webhook events:
   - ✅ `TRANSACTIONS` - Transaction updates
   - ✅ `ITEM` - Item status changes (errors, disconnections)

### 4. Test the Connection Flow

#### Step 1: Restart Development Server

After updating environment variables:

```bash
# Stop your dev server (Ctrl+C)
# Start again
npm run dev
```

#### Step 2: Test Connection

1. Go to: `https://lifestacks.ai/modules/budget-optimizer` (or `http://localhost:3000/modules/budget-optimizer` locally)
2. Click "Connect Bank Account"
3. **Use your REAL bank credentials** (this is production!)
4. Complete the Plaid Link flow
5. The connection should now save successfully!

#### Step 3: Check for Success

After connecting:

- ✅ Bank account should appear in the "Bank Connections" section
- ✅ Account balances should display
- ✅ No error messages in browser console
- ✅ Check Vercel function logs (if deployed) for any errors

### 5. Verify Connection is Saved

Check your Supabase database:

```sql
-- Check if connection exists
SELECT id, institution_name, status, created_at
FROM bank_connections
ORDER BY created_at DESC
LIMIT 5;

-- Check if accounts exist
SELECT ba.name, ba.type, ba.current_balance, bc.institution_name
FROM bank_accounts ba
JOIN bank_connections bc ON ba.bank_connection_id = bc.id
ORDER BY ba.created_at DESC
LIMIT 10;
```

### 6. Deploy to Production (Vercel)

If testing locally works:

1. **Set environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `PLAID_CLIENT_ID` = Your production Client ID
     - `PLAID_ENV` = `production`
     - `PLAID_SECRET_PRODUCTION` = Your production Secret
     - `TOKEN_ENCRYPTION_KEY` = Your encryption key (same as local)
     - `PLAID_WEBHOOK_URL` = `https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook`
     - `NEXTAUTH_URL` = `https://lifestacks.ai`

2. **Redeploy:**

   ```bash
   # Trigger a new deployment
   git commit --allow-empty -m "Update Plaid to production"
   git push
   ```

   OR redeploy from Vercel Dashboard

3. **Test in production:**
   - Go to your live site
   - Try connecting a bank account
   - Verify it works end-to-end

## Troubleshooting Production Issues

### Issue: "Invalid Plaid credentials"

**Solution:**

- Double-check you're using **Production** secret, not Sandbox
- Verify `PLAID_ENV=production` is set
- Ensure no extra spaces or quotes in environment variables
- Restart dev server / redeploy after changing env vars

### Issue: "Bank connection not showing after approval"

**Solution:**

- Check browser console for errors (F12 → Console)
- Check Vercel function logs for database errors
- Verify database tables exist (run migration if needed)
- Check if RLS policies allow reading bank connections

### Issue: "Database error: column does not exist"

**Solution:**

- This was the schema mismatch issue - **should be fixed now**
- If still happening, verify migrations are applied:
  ```sql
  -- Check if columns exist
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'bank_connections'
  AND column_name IN ('access_token', 'item_id');
  ```

### Issue: "Encryption failed"

**Solution:**

- Verify `TOKEN_ENCRYPTION_KEY` is set and at least 32 characters
- Generate a new key: `openssl rand -hex 32`
- Restart dev server / redeploy after adding key

## What Changed (Schema Fix)

### Before (Broken):

```typescript
// Tried to insert columns that don't exist
plaid_access_token: encryptedAccessToken // ❌ Column doesn't exist
plaid_item_id: itemId // ❌ Column doesn't exist
```

### After (Fixed):

```typescript
// Uses correct column names that exist in database
access_token: encryptedAccessToken // ✅ Correct
item_id: itemId // ✅ Correct
```

This fix was applied to:

- ✅ `exchange-token/route.ts` - Now saves connections correctly
- ✅ `sync-transactions/route.ts` - Now reads tokens correctly
- ✅ `webhook/route.ts` - Now finds connections correctly

## Next Steps

1. ✅ Update environment variables for production
2. ✅ Restart dev server
3. ✅ Test connection with real bank account
4. ✅ Deploy to production
5. ✅ Test in production environment
6. ✅ Monitor for any errors in Vercel logs

## Cost Considerations

Plaid Production Pricing:

- **Link Token Creation**: ~$0.50 per successful connection
- **Transaction Sync**: ~$0.10 per 100 transactions
- **Account Balance Checks**: ~$0.10 per 100 requests
- Monthly minimums may apply

Monitor usage in Plaid Dashboard to track costs.
