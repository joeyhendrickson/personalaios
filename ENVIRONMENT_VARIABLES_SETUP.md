# Environment Variables Setup Guide

## Required Environment Variables for Trial Email System

Add these to your `.env.local` file (local development) and Vercel environment variables (production):

### 1. Resend API Key

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**How to get it:**

1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in
3. Verify your domain (lifestacks.ai):
   - Add DNS records provided by Resend
   - Wait for verification (usually a few minutes)
4. Go to API Keys section
5. Click "Create API Key"
6. Copy the key and add to your `.env.local`

**Domain Verification:**

- You must verify `lifestacks.ai` to send from `notifications@lifestacks.ai`
- Resend provides DNS records (TXT, MX, CNAME)
- Add these to your domain registrar
- Verify in Resend dashboard

---

### 2. Cron Job Secret

```bash
CRON_SECRET=your-secure-random-string-here
```

**How to generate:**

Option 1 - Using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Option 2 - Using OpenSSL:

```bash
openssl rand -hex 32
```

Option 3 - Online generator:

- Use https://passwordsgenerator.net/
- Generate a 64-character alphanumeric string

**Purpose**: Protects the cron endpoint from unauthorized access

---

### 3. App URL (Already Set)

```bash
NEXT_PUBLIC_APP_URL=https://www.lifestacks.ai
```

This is used in email templates for buttons and links.

---

## Complete .env.local Example

```bash
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (existing)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# PayPal (existing)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox

# NEW: Resend Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# NEW: Cron Job Protection
CRON_SECRET=your-secure-random-string-here

# App URL
NEXT_PUBLIC_APP_URL=https://www.lifestacks.ai
```

---

## Vercel Environment Variables Setup

### Production Deployment

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxx`
   - Environment: Production, Preview, Development
   - Click "Save"

4. Repeat for `CRON_SECRET`

5. For `NEXT_PUBLIC_APP_URL`:
   - Set to `https://www.lifestacks.ai` for Production
   - Set to your preview URL for Preview
   - Set to `http://localhost:3000` for Development

### Redeploy

After adding environment variables:

```bash
git push origin main
```

Or trigger a manual redeploy in Vercel dashboard.

---

## Vercel Cron Jobs Setup

### 1. Automatic Detection

Vercel automatically detects `vercel-cron.json` and sets up cron jobs on deployment.

### 2. Verify Cron Jobs

1. Go to Vercel project dashboard
2. Click "Cron Jobs" in the sidebar
3. You should see:
   - **Path**: `/api/cron/check-trials`
   - **Schedule**: `0 */12 * * *` (every 12 hours)
   - **Status**: Active

### 3. Manual Trigger (Testing)

You can manually trigger the cron job:

```bash
curl -X GET https://www.lifestacks.ai/api/cron/check-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Testing the Setup

### 1. Check Resend Connection

Create a test file `test-email.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function test() {
  const result = await resend.emails.send({
    from: 'Life Stacks <notifications@lifestacks.ai>',
    to: 'your-email@example.com',
    subject: 'Test Email',
    html: '<p>If you receive this, Resend is working!</p>',
  })
  console.log('Email sent:', result)
}

test()
```

Run: `npx ts-node test-email.ts`

### 2. Check Cron Endpoint

```bash
# Test locally (with dev server running)
curl -X GET http://localhost:3000/api/cron/check-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test production
curl -X GET https://www.lifestacks.ai/api/cron/check-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:

```json
{
  "success": true,
  "checked": "2025-10-11T14:30:00.000Z",
  "notifications": 0,
  "errors": 0,
  "details": {
    "notifications": [],
    "errors": []
  }
}
```

### 3. Check Admin Dashboard

1. Log in to admin account
2. Go to `/admin`
3. Scroll to "Trial Subscriptions" section
4. Verify stats are showing correctly
5. Check notification status for each trial

---

## Troubleshooting

### Resend API Key Invalid

**Error**: `Invalid API key`

**Solution**:

- Verify the key is correct in `.env.local`
- Check for extra spaces or line breaks
- Regenerate the key in Resend dashboard
- Restart your dev server

### Domain Not Verified

**Error**: `Domain not verified` or `Sender not verified`

**Solution**:

1. Go to Resend dashboard → Domains
2. Click on lifestacks.ai
3. Verify all DNS records are added:
   - TXT record for domain verification
   - MX record for receiving bounces
   - CNAME records for DKIM
4. Wait a few minutes and check verification status

### Cron Job Not Running

**Error**: Cron job doesn't trigger

**Solution**:

1. Check `vercel-cron.json` is in root directory
2. Verify it's committed to git
3. Redeploy to Vercel
4. Check Vercel dashboard → Cron Jobs section
5. Verify `CRON_SECRET` is set in Vercel environment variables

### Unauthorized Cron Access

**Error**: `401 Unauthorized` when calling cron endpoint

**Solution**:

- Check `Authorization` header format: `Bearer YOUR_SECRET`
- Verify `CRON_SECRET` matches in Vercel and your request
- Check for typos or extra spaces

---

## Security Checklist

- [x] Resend API key is secret, not committed to git
- [x] CRON_SECRET is random and strong (32+ characters)
- [x] Cron endpoint is protected by authentication
- [x] Environment variables are set in Vercel (not just local)
- [x] Domain is verified to prevent email spoofing
- [x] No sensitive data in email templates

---

## Next Steps

1. ✅ Add environment variables to `.env.local`
2. ✅ Add environment variables to Vercel
3. ✅ Run database migration: `create-trial-system-complete.sql`
4. ✅ Verify domain in Resend
5. ✅ Test email sending locally
6. ✅ Deploy to Vercel
7. ✅ Verify cron job is active
8. ✅ Check admin dashboard shows trial data

---

## Support

If you encounter issues:

1. Check Vercel logs: `vercel logs`
2. Check Resend logs in their dashboard
3. Check browser console for errors
4. Review Supabase logs
5. Contact support@lifestacks.ai
