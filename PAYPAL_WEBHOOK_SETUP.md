# PayPal Webhook Setup for Recurring Subscriptions

## Overview
This guide will help you set up PayPal webhooks to handle monthly recurring subscription payments, cancellations, renewals, and payment failures.

---

## Step 1: Run Database Migration

In your Supabase SQL editor, run:
```sql
add-subscription-fields.sql
```

This adds:
- `paypal_subscription_id` to subscriptions table
- `paypal_subscription_id` to payments table
- `webhook_events` table for logging all webhook activity

---

## Step 2: Create PayPal Subscription Plans

### Using PayPal Dashboard:

1. Go to: https://www.paypal.com/billing/plans (or sandbox equivalent)
2. Click **Create Plan**

### Basic Plan ($49.99/month):
- **Plan Name**: Life Stacks Basic Monthly
- **Plan ID**: Copy this - you'll need it! (e.g., `P-1AB23456CD789012E`)
- **Billing Cycle**: Monthly
- **Price**: $49.99 USD
- **Description**: Full access to all Life Stacks features

### Premium Plan ($249.99/month):
- **Plan Name**: Life Stacks Premium Monthly
- **Plan ID**: Copy this - you'll need it! (e.g., `P-2XY34567EF890123G`)
- **Billing Cycle**: Monthly
- **Price**: $249.99 USD
- **Description**: Everything in Basic plus personal AI coaching

---

## Step 3: Set Up PayPal Webhooks

### 3.1 Access Webhooks Settings

**Production:**
1. Log in to https://www.paypal.com
2. Go to Dashboard → Developer → Webhooks

**Sandbox (for testing):**
1. Log in to https://developer.paypal.com
2. Go to Dashboard → Apps & Credentials → Sandbox
3. Click your app → Webhooks

### 3.2 Create Webhook

Click **Add Webhook** and configure:

**Webhook URL:**
```
https://www.lifestacks.ai/api/webhooks/paypal
```

**Webhook ID:** PayPal will generate this - **COPY IT!** You'll need it for your `.env`

### 3.3 Select Events to Subscribe To

Check these events (critical for recurring subscriptions):

**Billing Events:**
- ✅ `BILLING.SUBSCRIPTION.CREATED` - When subscription is created
- ✅ `BILLING.SUBSCRIPTION.ACTIVATED` - When subscription becomes active
- ✅ `BILLING.SUBSCRIPTION.CANCELLED` - When user cancels subscription
- ✅ `BILLING.SUBSCRIPTION.SUSPENDED` - When subscription is suspended
- ✅ `BILLING.SUBSCRIPTION.PAYMENT.FAILED` - When monthly payment fails
- ✅ `BILLING.SUBSCRIPTION.RENEWED` - When subscription renews successfully
- ✅ `BILLING.SUBSCRIPTION.UPDATED` - When subscription is modified

**Payment Events:**
- ✅ `PAYMENT.SALE.COMPLETED` - When each monthly payment completes
- ✅ `PAYMENT.SALE.REFUNDED` - When payment is refunded
- ✅ `PAYMENT.SALE.REVERSED` - When payment is reversed

Click **Save**.

---

## Step 4: Add Environment Variables

### Add to `.env.local`:

```bash
# PayPal Subscription Plans
PAYPAL_BASIC_PLAN_ID=P-1AB23456CD789012E
PAYPAL_PREMIUM_PLAN_ID=P-2XY34567EF890123G

# PayPal Webhook
PAYPAL_WEBHOOK_ID=1A234567B890C123D456E
```

### Add to Vercel Environment Variables:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `PAYPAL_BASIC_PLAN_ID`
   - `PAYPAL_PREMIUM_PLAN_ID`
   - `PAYPAL_WEBHOOK_ID`
3. Select: Production, Preview, Development
4. Save

---

## Step 5: Update PayPal Button to Use Subscriptions

You'll need to modify your `PayPalButton` component to use **subscription** mode instead of one-time payments.

Create a new component: `src/components/paypal/paypal-subscription-button.tsx`

```typescript
'use client'

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'

interface PayPalSubscriptionButtonProps {
  planType: 'basic' | 'premium'
  onSuccess?: (subscriptionId: string) => void
  onError?: (error: any) => void
  className?: string
}

export function PayPalSubscriptionButton({
  planType,
  onSuccess,
  onError,
  className = ''
}: PayPalSubscriptionButtonProps) {
  const planId = planType === 'basic' 
    ? process.env.NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID 
    : process.env.NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID

  return (
    <PayPalScriptProvider 
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        vault: true,
        intent: 'subscription'
      }}
    >
      <div className={className}>
        <PayPalButtons
          createSubscription={(data, actions) => {
            return actions.subscription.create({
              plan_id: planId!
            })
          }}
          onApprove={(data, actions) => {
            console.log('Subscription created:', data.subscriptionID)
            onSuccess?.(data.subscriptionID!)
            return Promise.resolve()
          }}
          onError={(err) => {
            console.error('PayPal subscription error:', err)
            onError?.(err)
          }}
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'subscribe'
          }}
        />
      </div>
    </PayPalScriptProvider>
  )
}
```

**Important:** You'll need to install the PayPal SDK:
```bash
npm install @paypal/react-paypal-js
```

---

## Step 6: Update Paywall Modal

Modify `src/components/paywall/paywall-modal.tsx` to use subscription buttons:

```tsx
{selectedPlan !== 'trial' && (
  <PayPalSubscriptionButton
    planType={selectedPlan}
    onSuccess={handleSubscriptionSuccess}
    onError={handlePaymentError}
    className="w-full"
  />
)}
```

---

## Step 7: Test Webhooks

### 7.1 Use PayPal Webhook Simulator

1. Go to PayPal Developer Dashboard
2. Navigate to Webhooks
3. Click on your webhook
4. Click **Simulate Event**
5. Select event type (e.g., `BILLING.SUBSCRIPTION.ACTIVATED`)
6. Click **Send Test**

### 7.2 Check Webhook Logs

**In Supabase:**
```sql
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;
```

**In Vercel:**
- Go to your project → Deployments
- Click on latest deployment → Functions
- Find `/api/webhooks/paypal`
- View logs

---

## Step 8: Monitor Webhook Activity in Admin Dashboard

Add webhook monitoring to your admin dashboard:

```typescript
// In src/app/admin/page.tsx

const [webhookEvents, setWebhookEvents] = useState([])

// Fetch webhook events
const webhookResponse = await fetch('/api/admin/webhooks')
if (webhookResponse.ok) {
  const webhookData = await webhookResponse.json()
  setWebhookEvents(webhookData.events || [])
}
```

---

## Webhook Event Flow

### New Subscription:
```
User Subscribes → BILLING.SUBSCRIPTION.CREATED → 
BILLING.SUBSCRIPTION.ACTIVATED → Record created in subscriptions table
```

### Monthly Renewal:
```
PayPal Charges Card → PAYMENT.SALE.COMPLETED → 
Record created in payments table → 
BILLING.SUBSCRIPTION.RENEWED → Update subscription
```

### Cancellation:
```
User Cancels → BILLING.SUBSCRIPTION.CANCELLED → 
Update subscription status to 'cancelled'
```

### Failed Payment:
```
Payment Fails → BILLING.SUBSCRIPTION.PAYMENT.FAILED → 
Update subscription status to 'past_due' → 
Send email to user
```

---

## Environment Variables Summary

Make sure you have all of these in both `.env.local` and Vercel:

```bash
# PayPal Core
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_MODE=sandbox  # or 'production'

# PayPal Subscription Plans
NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID=P-1AB23456CD789012E
NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID=P-2XY34567EF890123G

# PayPal Webhook
PAYPAL_WEBHOOK_ID=1A234567B890C123D456E
```

---

## Vercel Configuration

Ensure `vercel.json` allows webhooks (no authentication required for POST):

```json
{
  "headers": [
    {
      "source": "/api/webhooks/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## Testing Checklist

### Sandbox Testing:
- [ ] Create Basic plan subscription
- [ ] Verify `BILLING.SUBSCRIPTION.CREATED` webhook received
- [ ] Verify `BILLING.SUBSCRIPTION.ACTIVATED` webhook received
- [ ] Check subscription appears in admin dashboard
- [ ] Simulate payment failure
- [ ] Verify `BILLING.SUBSCRIPTION.PAYMENT.FAILED` webhook received
- [ ] Cancel subscription
- [ ] Verify `BILLING.SUBSCRIPTION.CANCELLED` webhook received

### Production Testing:
- [ ] Verify webhook URL is correct
- [ ] Verify webhook signature validation works
- [ ] Monitor first real subscription
- [ ] Monitor first renewal (after 1 month)
- [ ] Set up alerts for failed webhooks

---

## Troubleshooting

### Webhook Not Received:
1. Check webhook URL is correct and accessible
2. Verify PayPal can reach your server (not localhost)
3. Check Vercel function logs for errors
4. Verify webhook events are selected in PayPal

### Signature Verification Fails:
1. Verify `PAYPAL_WEBHOOK_ID` matches your webhook in PayPal
2. Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
3. Ensure you're using correct mode (sandbox vs production)

### Subscription Not Created:
1. Check plan IDs are correct
2. Verify plan is active in PayPal
3. Check browser console for errors
4. Verify PayPal SDK is loaded correctly

---

## Next Steps After Setup:

1. ✅ Run database migration
2. ✅ Create subscription plans in PayPal
3. ✅ Set up webhook in PayPal dashboard
4. ✅ Add environment variables
5. ✅ Install `@paypal/react-paypal-js`
6. ✅ Create subscription button component
7. ✅ Update paywall modal
8. ✅ Test with sandbox
9. ✅ Deploy to production
10. ✅ Monitor first real transactions

---

## Support

- PayPal Webhooks Docs: https://developer.paypal.com/docs/api-basics/notifications/webhooks/
- PayPal Subscriptions: https://developer.paypal.com/docs/subscriptions/
- Webhook Events Reference: https://developer.paypal.com/api/rest/webhooks/event-names/

If you encounter issues, check:
1. Vercel function logs
2. Supabase webhook_events table
3. PayPal webhook delivery history
