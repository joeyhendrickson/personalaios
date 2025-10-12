# PayPal Integration Setup

This guide will help you set up PayPal integration for the Life Stacks paywall system.

## PayPal Developer Account Setup

1. **Create PayPal Developer Account**
   - Go to [PayPal Developer](https://developer.paypal.com/)
   - Sign up or log in with your PayPal account
   - Create a new application

2. **Create Application**
   - Click "Create App"
   - Choose "Default Application" or "Custom"
   - Select "Sandbox" for testing or "Live" for production
   - Note down your Client ID and Client Secret

## Environment Variables

Add these to your `.env.local` file:

```bash
# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
```

## Database Setup

Run the SQL script to create the access codes system:

```bash
# Run this in your Supabase SQL editor
psql -f create-access-codes-system.sql
```

## Testing

### Sandbox Testing

1. Use sandbox credentials from PayPal Developer Dashboard
2. Test payments with PayPal sandbox accounts
3. Verify access code creation in admin dashboard

### Production Deployment

1. Switch to live PayPal credentials
2. Update `PAYPAL_BASE_URL` to production URL
3. Test with real PayPal accounts

## Features

### Admin Dashboard

- Create access codes with names and expiration dates
- View all access codes and their usage status
- Toggle code active/inactive status
- Copy codes to clipboard

### User Experience

- **Free Trial Option**: 7-day free trial that converts to Basic Plan ($49.99/month)
- PayPal payment option with two plan tiers:
  - **Basic Plan**: $49.99/month - Full access to all Life Stacks features
  - **Premium Plan**: $249.99/month - Everything in Basic plus personal AI coaching
- Free access code redemption option
- Secure payment processing
- Automatic account creation after successful payment
- Trial status tracking and conversion management

### Access Code System

- 12-character alphanumeric codes
- Optional email restrictions
- Configurable expiration dates
- Usage tracking and analytics

## API Endpoints

- `POST /api/payment/verify-paypal` - Verify PayPal payments
- `POST /api/access-codes/verify` - Verify access codes
- `GET /api/admin/access-codes` - List all access codes (admin)
- `POST /api/admin/access-codes` - Create new access code (admin)
- `PUT /api/admin/access-codes` - Update access code (admin)
- `POST /api/trial/create` - Create new trial subscription
- `GET /api/trial/create` - Get trial subscription status
- `POST /api/trial/convert` - Convert trial to paid subscription

## Security Features

- Row Level Security (RLS) on access codes table
- Admin-only access to code management
- Secure PayPal payment verification
- Code expiration and usage tracking
- Protection against code reuse

## Troubleshooting

### Common Issues

1. **PayPal SDK not loading**
   - Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set
   - Verify client ID is correct for environment (sandbox/live)

2. **Payment verification fails**
   - Check `PAYPAL_CLIENT_SECRET` is set
   - Verify environment variables match PayPal app settings

3. **Access codes not working**
   - Check database functions are created
   - Verify RLS policies are enabled
   - Check admin user permissions

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG_PAYPAL=true
```

This will log detailed information about PayPal API calls and responses.
