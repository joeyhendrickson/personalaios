# Plaid Production Setup - Next Steps

Congratulations! You've been approved for Plaid production access. Follow these steps to enable production mode.

## Step 1: Get Your Production Credentials

1. **Log into your Plaid Dashboard**: [https://dashboard.plaid.com](https://dashboard.plaid.com)
2. **Navigate to Team Settings** > **Keys**
3. **Copy your Production credentials**:
   - **Client ID** (Production)
   - **Secret** (Production)
   - ⚠️ **Important**: These are different from your Sandbox credentials!

## Step 2: Update Local Environment Variables

Update your `.env.local` file. Since your Client ID is the same for both environments, you can set up both secrets:

### Recommended Approach (Separate Secrets)

```bash
# Plaid Configuration
# Client ID is the same for all environments
PLAID_CLIENT_ID=your_client_id_here

# Separate secrets for each environment
PLAID_SECRET_SANDBOX=your_sandbox_secret_here
PLAID_SECRET_PRODUCTION=your_production_secret_here

# Switch between environments by changing this value
PLAID_ENV=sandbox  # Use 'sandbox' for testing, 'production' for live
```

**Benefits:**

- ✅ Easy to switch between environments
- ✅ Both secrets available in one file
- ✅ No need to manually change secrets

### Alternative Approach (Single Secret)

If you prefer to use a single `PLAID_SECRET` variable:

```bash
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_production_secret_here  # Change this when switching
PLAID_ENV=production
```

**Note**: The code will automatically use `PLAID_SECRET_PRODUCTION` when `PLAID_ENV=production` if it's set, otherwise it falls back to `PLAID_SECRET`.

## Step 3: Update Production Environment Variables (Vercel)

1. **Go to your Vercel Dashboard**: [https://vercel.com](https://vercel.com)
2. **Select your project** → **Settings** → **Environment Variables**
3. **Add/Update these variables**:
   - `PLAID_CLIENT_ID` = Your production Client ID
   - `PLAID_SECRET` = Your production Secret
   - `PLAID_ENV` = `production`

4. **Important**: Make sure these are set for:
   - ✅ Production
   - ✅ Preview (optional, but recommended)
   - ✅ Development (optional)

5. **Redeploy your application** after updating environment variables

## Step 4: Update Webhook URL (If Needed)

The Plaid integration uses a webhook endpoint. Make sure your production webhook URL is correct:

1. **Check your webhook URL** in `src/lib/plaid.ts` (line 46):

   ```typescript
   webhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/plaid/webhook`,
   ```

2. **Set `NEXTAUTH_URL` environment variable** in Vercel to your production domain:

   ```bash
   NEXTAUTH_URL=https://your-production-domain.com
   ```

3. **Register the webhook in Plaid Dashboard**:
   - Go to **Team Settings** > **Webhooks**
   - Add your production webhook URL: `https://your-domain.com/api/plaid/webhook`
   - Select the events you want to receive (typically: `TRANSACTIONS`)

## Step 5: Test the Integration

### Local Testing (Optional - Use Sandbox First)

Before testing with real accounts, verify everything works:

1. **Start your local server**: `npm run dev`
2. **Navigate to**: `/modules/budget-optimizer`
3. **Test with a real bank account** (be careful - this will use production API)
4. **Verify**:
   - Link token creation works
   - Bank connection flow completes
   - Transactions sync correctly
   - Account balances display

### Production Testing

1. **Deploy to production** (if not already deployed)
2. **Test the full flow**:
   - Create link token
   - Connect a real bank account
   - Verify transactions sync
   - Check account balances

## Step 6: Security Checklist

Before going fully live, ensure:

- [ ] Production credentials are set in Vercel
- [ ] `PLAID_ENV=production` is set
- [ ] Webhook URL is configured in Plaid Dashboard
- [ ] `NEXTAUTH_URL` is set to production domain
- [ ] SSL/HTTPS is enabled (Vercel handles this automatically)
- [ ] Error monitoring is set up (Sentry, etc.)
- [ ] Rate limiting is configured (if applicable)
- [ ] Privacy policy mentions Plaid integration
- [ ] Terms of service updated (if needed)

## Step 7: Monitor Usage

1. **Check Plaid Dashboard** regularly for:
   - API usage and costs
   - Error rates
   - Webhook delivery status
   - Item status (connected accounts)

2. **Set up alerts** in Plaid Dashboard for:
   - High error rates
   - Webhook failures
   - Unusual activity

## Step 8: Cost Management

### Understanding Plaid Pricing

- **Link Token Creation**: ~$0.50 per successful connection
- **Transaction Sync**: ~$0.10 per 100 transactions
- **Account Balance Checks**: ~$0.10 per 100 requests
- **Monthly minimums may apply**

### Cost Optimization Tips

1. **Cache account balances** - Don't fetch on every request
2. **Batch transaction syncs** - Sync periodically, not real-time
3. **Use webhooks** - Let Plaid notify you of updates instead of polling
4. **Monitor usage** - Set up alerts for unexpected spikes

## Troubleshooting

### Common Issues

1. **"Plaid credentials not configured"**
   - Verify environment variables are set in Vercel
   - Check that `PLAID_ENV=production` is set
   - Redeploy after updating environment variables

2. **"Invalid credentials"**
   - Double-check you're using **Production** credentials, not Sandbox
   - Ensure no extra spaces or quotes in environment variables

3. **"Webhook not receiving events"**
   - Verify webhook URL is registered in Plaid Dashboard
   - Check that `NEXTAUTH_URL` is set correctly
   - Ensure your server is accessible from the internet

4. **"Item login required"**
   - User needs to reconnect their bank account
   - This happens when credentials expire or bank requires re-authentication

### Getting Help

- **Plaid Support**: Available through your Plaid Dashboard
- **Plaid Documentation**: [https://plaid.com/docs](https://plaid.com/docs)
- **Plaid Status Page**: [https://status.plaid.com](https://status.plaid.com)

## Next Steps After Setup

1. ✅ **Test with real accounts** - Verify everything works end-to-end
2. ✅ **Monitor for errors** - Watch logs and Plaid Dashboard
3. ✅ **Gather user feedback** - Ensure the experience is smooth
4. ✅ **Optimize costs** - Review usage patterns and optimize API calls
5. ✅ **Document any issues** - Keep notes for future reference

## Rollback Plan

If you encounter issues, you can temporarily rollback:

1. **Change `PLAID_ENV` back to `sandbox`** in Vercel
2. **Redeploy** your application
3. **Investigate** the issue
4. **Fix and re-enable** production mode

---

**Congratulations on getting approved!** 🎉

Your Plaid integration is ready for production. Follow these steps carefully and test thoroughly before announcing to users.
