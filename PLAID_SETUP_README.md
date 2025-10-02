# Plaid Integration Setup Guide

This guide will help you set up Plaid integration for the Budget Optimizer module.

## Prerequisites

1. **Plaid Account**: Sign up for a free Plaid account at [https://plaid.com](https://plaid.com)
2. **Environment Variables**: Add the required Plaid credentials to your `.env.local` file

## Step 1: Create Plaid Account

1. Go to [https://plaid.com](https://plaid.com) and sign up for a free account
2. Complete the onboarding process
3. Navigate to your Plaid Dashboard

## Step 2: Get Your Credentials

1. In your Plaid Dashboard, go to **Team Settings** > **Keys**
2. Copy your **Client ID** and **Secret** for the **Sandbox** environment
3. Note: For production, you'll need to go through Plaid's review process

## Step 3: Configure Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_secret_here
PLAID_ENV=sandbox
```

### Environment Options:

- `sandbox` - For development and testing (recommended for initial setup)
- `development` - For testing with real bank credentials (requires approval)
- `production` - For live production use (requires full Plaid review)

## Step 4: Run Database Migration

The budget system requires a database migration. Run the following command:

```bash
# Apply the budget system migration
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/015_create_budget_system.sql
```

Or if using Supabase CLI:

```bash
supabase db push
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/modules/budget-optimizer`
3. Click "Connect Bank Account"
4. Use Plaid's test credentials to connect a sandbox bank account

## Plaid Sandbox Test Credentials

For testing, you can use these sandbox credentials:

### Test Bank Accounts:

- **Username**: `user_good`
- **Password**: `pass_good`
- **PIN**: `1234`

### Test Credit Cards:

- **Username**: `user_good`
- **Password**: `pass_good`

## Security Features

### Read-Only Access

- The integration uses **read-only** access to your bank accounts
- We can only view transactions and account balances
- **No write access** - we cannot initiate transfers or payments

### Data Protection

- All bank credentials are handled by Plaid (never stored in our system)
- Access tokens are encrypted and stored securely
- All data transmission uses HTTPS encryption

### Privacy Controls

- Users can disconnect bank accounts at any time
- All transaction data is deleted when accounts are disconnected
- Users maintain full control over their financial data

## API Endpoints

The following API endpoints are available:

### Plaid Integration

- `POST /api/plaid/create-link-token` - Create link token for bank connection
- `POST /api/plaid/exchange-token` - Exchange public token for access token
- `POST /api/plaid/sync-transactions` - Sync transactions from bank

### Budget Management

- `GET /api/budget/connections` - Get user's bank connections
- `DELETE /api/budget/connections` - Disconnect bank account
- `GET /api/budget/transactions` - Get user's transactions
- `POST /api/budget/analyze` - Run AI budget analysis

## Features

### Bank Connection

- Secure OAuth-style connection through Plaid
- Support for 11,000+ financial institutions
- Real-time account balance updates
- Automatic transaction categorization

### AI-Powered Analysis

- Spending pattern recognition
- Savings opportunity identification
- Budget recommendations
- Financial health scoring
- Actionable insights

### Budget Management

- Custom budget categories
- Monthly budget tracking
- Goal setting and tracking
- Expense categorization
- Financial insights and alerts

## Troubleshooting

### Common Issues

1. **"Plaid credentials not configured"**
   - Ensure your environment variables are set correctly
   - Restart your development server after adding environment variables

2. **"Failed to create link token"**
   - Check your Plaid Client ID and Secret
   - Ensure you're using the correct environment (sandbox/development/production)

3. **"Bank connection failed"**
   - Verify you're using the correct test credentials for sandbox
   - Check your internet connection
   - Ensure Plaid's servers are accessible

### Getting Help

1. **Plaid Documentation**: [https://plaid.com/docs](https://plaid.com/docs)
2. **Plaid Support**: Available through your Plaid Dashboard
3. **Community**: [Plaid Community Forum](https://community.plaid.com)

## Production Deployment

### Before Going Live

1. **Complete Plaid Review**: Submit your application for production access
2. **Update Environment**: Change `PLAID_ENV` to `production`
3. **Security Audit**: Review all security measures
4. **User Testing**: Test with real bank accounts
5. **Compliance**: Ensure compliance with financial regulations

### Production Checklist

- [ ] Plaid production credentials configured
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Error monitoring set up
- [ ] User privacy policy updated
- [ ] Terms of service updated

## Cost Considerations

### Plaid Pricing

- **Sandbox**: Free
- **Development**: Free (with limits)
- **Production**: Pay-per-use model

### Typical Costs

- Link token creation: $0.50 per successful connection
- Transaction sync: $0.10 per 100 transactions
- Account balance checks: $0.10 per 100 requests

## Legal and Compliance

### Important Notes

- This is **not financial advice**
- Users should consult qualified financial advisors
- All trading and investment decisions are at user's own risk
- Ensure compliance with local financial regulations

### Data Handling

- Financial data is processed securely through Plaid
- No sensitive banking information is stored locally
- Users can delete their data at any time
- Regular security audits are recommended

## Support

For technical support or questions about the Budget Optimizer module:

1. Check the troubleshooting section above
2. Review Plaid's documentation
3. Contact your development team
4. Submit issues through your project's issue tracker

---

**Remember**: Always test thoroughly in sandbox mode before moving to production!
