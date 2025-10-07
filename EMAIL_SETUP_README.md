# Email Integration Setup Guide

This guide will help you set up email integration for the bug reporting system using Resend.

## Option 1: Resend (Recommended)

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get Your API Key

1. In the Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Give it a name like "Life Stacks Bug Reports"
4. Copy the API key (starts with `re_`)

### Step 3: Set Up Your Domain (Optional but Recommended)

For production, you should use your own domain:

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Add your domain (e.g., `lifestacks.ai`)
4. Follow the DNS setup instructions
5. Wait for verification

### Step 4: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Email Configuration
RESEND_API_KEY=re_your_api_key_here
BUG_REPORT_EMAIL=joeyhendrickson@me.com
```

For Vercel deployment, add these in your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `RESEND_API_KEY` and `BUG_REPORT_EMAIL`

### Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Go to your bug report page
3. Submit a test bug report
4. Check your email (joeyhendrickson@me.com) for the notification

## Option 2: Alternative Email Services

### SendGrid

```bash
npm install @sendgrid/mail
```

```typescript
// src/lib/email-sendgrid.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendBugReportEmail(data: BugReportEmailData) {
  const msg = {
    to: process.env.BUG_REPORT_EMAIL,
    from: 'noreply@lifestacks.ai',
    subject: `[${data.type.toUpperCase()}] ${data.title}`,
    html: generateBugReportHTML(data),
    text: generateBugReportText(data),
  }

  try {
    await sgMail.send(msg)
    return { success: true }
  } catch (error) {
    console.error('SendGrid error:', error)
    return { success: false, error: error.message }
  }
}
```

### Nodemailer with Gmail

```bash
npm install nodemailer
```

```typescript
// src/lib/email-nodemailer.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
})

export async function sendBugReportEmail(data: BugReportEmailData) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.BUG_REPORT_EMAIL,
    subject: `[${data.type.toUpperCase()}] ${data.title}`,
    html: generateBugReportHTML(data),
    text: generateBugReportText(data),
  }

  try {
    await transporter.sendMail(mailOptions)
    return { success: true }
  } catch (error) {
    console.error('Nodemailer error:', error)
    return { success: false, error: error.message }
  }
}
```

## Email Template Features

The email template includes:

- **Professional HTML design** with Life Stacks branding
- **Priority badges** with color coding
- **Type indicators** (Bug vs Feature Request)
- **Screenshot attachments** (if provided)
- **User information** and submission timestamp
- **Report ID** for tracking
- **Responsive design** for mobile viewing

## Troubleshooting

### Common Issues

1. **"Email service not configured" warning**
   - Make sure `RESEND_API_KEY` is set in your environment variables
   - Check that the API key is valid and active

2. **Emails not being received**
   - Check spam/junk folder
   - Verify the recipient email address
   - Check Resend dashboard for delivery logs

3. **Domain verification issues**
   - Ensure DNS records are properly set
   - Wait up to 24 hours for DNS propagation
   - Use Resend's domain verification tool

4. **Rate limiting**
   - Resend free tier: 3,000 emails/month, 100 emails/day
   - Upgrade to paid plan for higher limits

### Testing

You can test the email integration without sending real emails by:

1. Using Resend's test mode (add `test: true` to email options)
2. Setting up a test email address
3. Using a service like Mailtrap for development

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Consider using different API keys for development/production
- Monitor email sending for unusual activity
- Set up proper rate limiting

## Cost

- **Resend Free Tier**: 3,000 emails/month, 100 emails/day
- **Resend Pro**: $20/month for 50,000 emails
- **SendGrid Free**: 100 emails/day
- **Gmail**: Free with App Password setup

For a bug reporting system, the free tiers should be more than sufficient.
