# Plaid Integration Troubleshooting Guide

## Issues Fixed

### ✅ Schema Mismatch (FIXED)

The code was trying to use `plaid_access_token` and `plaid_item_id` columns that don't exist in the database. The actual schema uses `access_token` and `item_id`.

**Fixed in:**

- `src/app/api/modules/budget-optimizer/plaid/exchange-token/route.ts` - Now uses `access_token` and `item_id`
- `src/app/api/modules/budget-optimizer/plaid/sync-transactions/route.ts` - Now reads from `access_token`
- `src/app/api/modules/budget-optimizer/plaid/webhook/route.ts` - Now queries by `item_id`

## Step-by-Step Setup Checklist

### 1. Environment Variables (REQUIRED)

Add these to your `.env.local` file:

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id_here
PLAID_ENV=sandbox  # Use 'sandbox' for testing, 'production' for live

# Choose ONE of these based on your environment:
PLAID_SECRET_SANDBOX=your_sandbox_secret_here  # For sandbox/development
# OR
PLAID_SECRET_PRODUCTION=your_production_secret_here  # For production
# OR (legacy fallback)
PLAID_SECRET=your_secret_here

# Token Encryption (REQUIRED for storing access tokens securely)
TOKEN_ENCRYPTION_KEY=your_32_character_minimum_key_here

# Webhook URL (optional but recommended)
PLAID_WEBHOOK_URL=https://your-domain.com/api/modules/budget-optimizer/plaid/webhook
# OR set NEXTAUTH_URL and webhook will be auto-constructed
NEXTAUTH_URL=https://your-domain.com
```

**Important Notes:**

- `TOKEN_ENCRYPTION_KEY` must be at least 32 characters long
- For sandbox testing, use `PLAID_SECRET_SANDBOX`
- For production, use `PLAID_SECRET_PRODUCTION`
- You can get your credentials from [Plaid Dashboard](https://dashboard.plaid.com) → Team Settings → Keys

### 2. Database Tables (Should already exist)

Verify these tables exist in your Supabase database:

- `bank_connections` - with columns: `id`, `user_id`, `access_token`, `item_id`, `institution_id`, `institution_name`, `status`, `created_at`, `updated_at`, `last_sync_at`
- `bank_accounts` - with columns: `id`, `bank_connection_id`, `account_id`, `name`, `official_name`, `type`, `subtype`, `mask`, `current_balance`, `available_balance`, `iso_currency_code`
- `transactions` - for storing transaction data

If tables don't exist, run migration `015_create_budget_system.sql` from `supabase/migrations/`.

### 3. Testing the Connection Flow

#### Step 1: Check Environment Variables

```bash
# In your terminal, verify variables are loaded
echo $PLAID_CLIENT_ID
echo $PLAID_ENV
```

#### Step 2: Start Development Server

```bash
npm run dev
```

#### Step 3: Navigate to Budget Optimizer

Go to: `http://localhost:3000/modules/budget-optimizer`

#### Step 4: Click "Connect Bank Account"

- This should open Plaid Link
- For sandbox, use test credentials:
  - Username: `user_good`
  - Password: `pass_good`
  - PIN: `1234` (if required)

#### Step 5: Check Browser Console

Open browser DevTools (F12) → Console tab and look for:

- ✅ `Link token created successfully`
- ✅ `Plaid Link success!`
- ✅ `Token exchange successful`
- ❌ Any error messages

#### Step 6: Check Server Logs

In your terminal where `npm run dev` is running, look for:

- ✅ `Link token created successfully. Webhook URL: ...`
- ✅ `Access token encrypted successfully`
- ✅ `Attempting to store bank connection: ...`
- ❌ Any error messages (especially database errors)

### 4. Common Issues and Solutions

#### Issue: "Plaid credentials not configured"

**Solution:**

- Check `.env.local` has `PLAID_CLIENT_ID` and `PLAID_SECRET_SANDBOX` (or `PLAID_SECRET_PRODUCTION`)
- Restart your dev server after adding environment variables
- Verify no extra spaces or quotes around values

#### Issue: "Invalid Plaid credentials"

**Solution:**

- Double-check credentials match your Plaid Dashboard
- Ensure you're using sandbox credentials if `PLAID_ENV=sandbox`
- Verify no typos in the secret key

#### Issue: "Encryption failed" or "TOKEN_ENCRYPTION_KEY not set"

**Solution:**

- Add `TOKEN_ENCRYPTION_KEY` to `.env.local` (minimum 32 characters)
- Generate a secure key: `openssl rand -hex 32`
- Restart dev server

#### Issue: "Bank connection not found" or database errors

**Solution:**

- Verify database tables exist (run migration `015_create_budget_system.sql`)
- Check Supabase connection is working
- Verify RLS policies are set correctly (should allow users to insert their own connections)

#### Issue: Link token creation succeeds but Plaid Link doesn't open

**Solution:**

- Check browser console for JavaScript errors
- Verify `react-plaid-link` package is installed: `npm list react-plaid-link`
- Check if Plaid Link is being blocked by browser popup blocker

#### Issue: Connection succeeds but bank account doesn't show on page

**Solution:**

- Check browser console for errors in `loadBankConnections()`
- Verify API route `/api/budget/connections` returns data
- Check if RLS policies allow reading bank connections
- Refresh the page after connection

### 5. Debugging Steps

#### Enable Verbose Logging

Add to your `.env.local`:

```bash
NODE_ENV=development
```

#### Check API Routes Directly

1. **Test Link Token Creation:**

   ```bash
   curl -X POST http://localhost:3000/api/modules/budget-optimizer/plaid/create-link-token \
     -H "Cookie: your-auth-cookie-here"
   ```

2. **Test Connections List:**
   ```bash
   curl http://localhost:3000/api/budget/connections \
     -H "Cookie: your-auth-cookie-here"
   ```

#### Check Database Directly

In Supabase SQL Editor, run:

```sql
-- Check if connections exist
SELECT * FROM bank_connections ORDER BY created_at DESC LIMIT 5;

-- Check if accounts exist for a connection
SELECT ba.*, bc.institution_name
FROM bank_accounts ba
JOIN bank_connections bc ON ba.bank_connection_id = bc.id
ORDER BY ba.created_at DESC LIMIT 10;
```

### 6. Production Deployment Checklist

Before deploying to production:

- [ ] Set `PLAID_ENV=production` in Vercel environment variables
- [ ] Set `PLAID_SECRET_PRODUCTION` in Vercel (not sandbox secret!)
- [ ] Set `TOKEN_ENCRYPTION_KEY` in Vercel (same value as local for existing users, or generate new)
- [ ] Set `PLAID_WEBHOOK_URL` to production webhook endpoint
- [ ] Register webhook URL in Plaid Dashboard → Team Settings → Webhooks
- [ ] Test connection flow in production environment
- [ ] Verify webhook delivery in Plaid Dashboard

### 7. Getting Help

If you're still having issues:

1. **Check Plaid Dashboard:**
   - Go to https://dashboard.plaid.com
   - Check API logs for errors
   - Verify webhook delivery status

2. **Check Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Check Database → Tables to verify schema
   - Check Logs → API for database errors

3. **Check Vercel Logs (if deployed):**
   - Go to Vercel Dashboard → Your Project → Functions
   - Check function logs for errors

4. **Common Error Codes:**
   - `INVALID_CLIENT_ID` - Wrong Client ID
   - `INVALID_SECRET` - Wrong Secret or wrong environment
   - `ITEM_LOGIN_REQUIRED` - User needs to reconnect (expired credentials)
   - `RATE_LIMIT_EXCEEDED` - Too many requests, wait and retry

## Next Steps After Connection Works

Once you can successfully connect a bank account:

1. ✅ Test transaction syncing
2. ✅ Verify accounts display correctly
3. ✅ Test transaction filtering by date range
4. ✅ Test webhook delivery (optional)
5. ✅ Update sync route to use `transactionsSync` with cursors (improvement, not critical)
