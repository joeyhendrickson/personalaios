# Plaid Production Setup Checklist

## ✅ Schema Mismatch - FIXED!

The schema mismatch issue has been fixed. The code now uses the correct column names:

- ✅ Uses `access_token` (not `plaid_access_token`)
- ✅ Uses `item_id` (not `plaid_item_id`)

## Current Environment Setup

From your `.env.local`:

- ✅ `PLAID_CLIENT_ID` = Set
- ✅ `PLAID_ENV` = `production` ✅ (Good - using production!)
- ✅ `PLAID_SECRET_PRODUCTION` = Set
- ✅ `TOKEN_ENCRYPTION_KEY` = Set

**Note:** You're correctly set up for production, not sandbox. This is correct for real bank accounts.

## What Was Wrong (Before Fix)

**The Problem:**

1. ✅ Plaid Link flow completes successfully
2. ✅ User approves bank connection
3. ✅ Public token exchanged for access token
4. ❌ **Database insert fails** because code tried to use `plaid_access_token` and `plaid_item_id` columns that don't exist
5. ❌ Connection never gets saved
6. ❌ Bank account doesn't display

**The Fix:**

- Changed code to use `access_token` and `item_id` columns (which actually exist)
- Now connections will save correctly!

## Next Steps to Test

### 1. Restart Your Dev Server (IMPORTANT!)

After the code fix, you MUST restart:

```bash
# Stop your current dev server (Ctrl+C)
# Start again
npm run dev
```

**Why?** Next.js caches API routes. You need to restart for the fixes to take effect.

### 2. Test the Connection Flow

1. Go to: `http://localhost:3000/modules/budget-optimizer`
2. Click "Connect Bank Account"
3. **Use your REAL bank credentials** (this is production!)
4. Complete the Plaid Link flow
5. **It should now work!** The connection should save and display

### 3. Verify It Works

After connecting, check:

- ✅ Bank account appears in "Bank Connections" section
- ✅ Account balances display
- ✅ No error messages in browser console (F12 → Console)
- ✅ No error messages in terminal where `npm run dev` is running

### 4. Check Database (Optional)

If you want to verify the connection was saved:

```sql
-- Run this in Supabase SQL Editor
SELECT
  id,
  institution_name,
  status,
  created_at,
  last_sync_at
FROM bank_connections
ORDER BY created_at DESC
LIMIT 5;
```

You should see your newly connected bank!

## If You Still See Errors

### Check Browser Console (F12)

Look for error messages like:

- "Failed to exchange token"
- "Database error"
- "Bank connection not found"

### Check Server Logs (Terminal)

Look for:

- "Error storing bank connection"
- Database error codes (like `42703` = column does not exist)
- Any stack traces

### Common Issues:

**Issue: "Column does not exist"**

- ✅ Should be fixed now, but if you see this, restart your dev server

**Issue: "Plaid credentials not configured"**

- Check your `.env.local` has all the variables above
- Restart dev server after changing env vars

**Issue: "Encryption failed"**

- Verify `TOKEN_ENCRYPTION_KEY` is set and is at least 32 characters
- Restart dev server after adding it

**Issue: Connection saves but doesn't display**

- Check browser console for errors in `loadBankConnections()`
- Verify `/api/budget/connections` API route works
- Try refreshing the page

## Deploy to Production (Vercel)

Once it works locally:

1. **Set environment variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add/Update:
     - `PLAID_CLIENT_ID` = `68dd02c81bd11c0021c6416d`
     - `PLAID_ENV` = `production`
     - `PLAID_SECRET_PRODUCTION` = Your production secret (full length!)
     - `TOKEN_ENCRYPTION_KEY` = Your encryption key (same as local)
     - `PLAID_WEBHOOK_URL` = `https://lifestacks.ai/api/modules/budget-optimizer/plaid/webhook`
     - `NEXTAUTH_URL` = `https://lifestacks.ai`

2. **Redeploy:**

   ```bash
   git add .
   git commit -m "Fix Plaid schema mismatch - use correct column names"
   git push
   ```

   OR redeploy from Vercel Dashboard

3. **Test in production:**
   - Go to `https://lifestacks.ai/modules/budget-optimizer`
   - Connect a bank account
   - Verify it works!

## Summary

✅ **Schema mismatch fixed** - Code now uses correct column names  
✅ **You're set up for production** - Using `PLAID_ENV=production`  
✅ **Environment variables set** - All required vars are configured

**Next:** Restart dev server and test the connection flow. It should work now!
