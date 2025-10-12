# Trial Email Notification System

## Overview

Automated email notification system that sends users reminders 48 hours before their 7-day free trial expires, and again when the trial ends. All notifications are tracked in the admin dashboard.

---

## Features

### 📧 Email Notifications

- **48-Hour Notice**: Sent 2 days before trial expiration
- **Expiration Notice**: Sent when trial ends
- **Beautiful HTML Templates**: Professional, branded email design
- **Tracking**: All email sends are logged with message IDs

### 📊 Admin Dashboard Tracking

- **Trial Statistics**: Active, expired, converted trials
- **Notification Status**: See which emails have been sent
- **Pending Notifications**: Identify trials needing notifications
- **Email History**: View when notifications were sent

### 🔄 Automated System

- **Cron Job**: Runs every 12 hours to check for expiring trials
- **Smart Detection**: Only sends notifications at appropriate times
- **Status Management**: Automatically updates trial status

---

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Cron Job Secret (generate a random string)
CRON_SECRET=your-secure-random-string-here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://www.lifestacks.ai
```

### 2. Resend Setup

1. Sign up at [https://resend.com](https://resend.com)
2. Verify your domain (lifestacks.ai)
3. Create an API key
4. Add the API key to your environment variables

### 3. Database Schema

Run the SQL migration in your Supabase SQL editor:

```bash
create-trial-system-complete.sql
```

This creates:

- `trial_subscriptions` table with email notification tracking fields
- `subscriptions` table for post-trial paid subscriptions
- Proper RLS policies and indexes

### 4. Vercel Cron Job

The system uses Vercel Cron Jobs to automatically check for expiring trials.

**Configuration**: `vercel-cron.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-trials",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

This runs every 12 hours (midnight and noon UTC).

**Cron Endpoint**: `/api/cron/check-trials`

- Protected by `CRON_SECRET` authentication
- Checks for trials expiring in 48 hours
- Sends appropriate notifications
- Updates notification tracking fields

---

## Database Schema

### trial_subscriptions Table

| Column                              | Type          | Description                             |
| ----------------------------------- | ------------- | --------------------------------------- |
| id                                  | UUID          | Primary key                             |
| email                               | VARCHAR(255)  | User's email address                    |
| name                                | VARCHAR(255)  | User's name (optional)                  |
| trial_start                         | TIMESTAMP     | When trial started                      |
| trial_end                           | TIMESTAMP     | When trial ends                         |
| status                              | VARCHAR(20)   | active, expired, converted, cancelled   |
| will_convert_to                     | VARCHAR(20)   | Plan after trial (basic/premium)        |
| conversion_price                    | DECIMAL(10,2) | Price after trial                       |
| **expiry_notification_sent_at**     | TIMESTAMP     | When 48h notice was sent                |
| **expiry_notification_message_id**  | VARCHAR(255)  | Resend message ID for 48h notice        |
| **expired_notification_sent_at**    | TIMESTAMP     | When expiration notice was sent         |
| **expired_notification_message_id** | VARCHAR(255)  | Resend message ID for expiration notice |
| created_at                          | TIMESTAMP     | Record creation time                    |
| updated_at                          | TIMESTAMP     | Last update time                        |

---

## API Endpoints

### Trial Management

**Create Trial**

```http
POST /api/trial/create
{
  "email": "user@example.com"
}
```

**Get Trial Status**

```http
GET /api/trial/create?email=user@example.com
```

**Convert Trial to Paid**

```http
POST /api/trial/convert
{
  "email": "user@example.com",
  "paymentId": "pay_xxx",
  "planType": "basic"
}
```

### Admin Endpoints

**Get All Trials (Admin Only)**

```http
GET /api/admin/trials
```

Returns:

```json
{
  "success": true,
  "trials": [...],
  "stats": {
    "total": 50,
    "active": 10,
    "expired": 5,
    "converted": 30,
    "cancelled": 5,
    "expiryNotificationsSent": 8,
    "expiredNotificationsSent": 5,
    "pendingNotifications": 2
  }
}
```

### Cron Job

**Check Trials (Protected)**

```http
GET /api/cron/check-trials
Headers:
  Authorization: Bearer YOUR_CRON_SECRET
```

---

## Email Templates

### 48-Hour Notice Email

**Subject**: ⏰ Your Life Stacks Trial Ends in 2 Days

**Content**:

- Friendly reminder about trial expiration
- Clear date when trial ends
- List of features they'll keep
- "Upgrade Now" button
- Pricing information
- Support contact info

### Trial Expired Email

**Subject**: ⚠️ Your Life Stacks Trial Has Ended - Upgrade to Continue

**Content**:

- Trial has ended notification
- Account is now limited
- "Upgrade Your Account" button
- Reassurance that data is safe
- Clear pricing and plan info

---

## Admin Dashboard Features

### Trial Statistics Card

- **Active Trials**: Current active trials
- **Pending Notifications**: Trials needing email notifications
- Shows in overview stats section

### Trial Subscriptions Section

Displays for each trial:

- ✅ User email and name
- ✅ Trial status (active/expired/converted/cancelled)
- ✅ Days remaining (for active trials)
- ✅ Trial period dates
- ✅ Conversion pricing and plan
- ✅ **Email Notification Status**:
  - 48h notice sent ✓
  - Expiry notice sent ✓
  - Needs 48h notice ⚠️
  - Needs expiry notice ⚠️
- ✅ Timestamps of when notifications were sent

---

## Notification Logic

### 48-Hour Notice

- **Trigger**: When trial has 2 days remaining
- **Condition**: `expiry_notification_sent_at` is NULL
- **Action**:
  1. Send email
  2. Update `expiry_notification_sent_at`
  3. Store `expiry_notification_message_id`

### Expiration Notice

- **Trigger**: When trial end date has passed
- **Condition**: `expired_notification_sent_at` is NULL
- **Action**:
  1. Update trial status to 'expired'
  2. Send email
  3. Update `expired_notification_sent_at`
  4. Store `expired_notification_message_id`

---

## Testing

### Manual Cron Trigger

You can manually trigger the cron job for testing:

```bash
curl -X GET https://your-app.vercel.app/api/cron/check-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Create Test Trial

1. Start a trial subscription through the paywall modal
2. In Supabase, manually set the `trial_end` date to 2 days from now
3. Wait for the next cron run (or trigger manually)
4. Check admin dashboard for notification status

---

## Monitoring

### Admin Dashboard

- Check the "Trial Subscriptions" section
- Look for pending notifications (orange badges)
- Verify sent notifications have timestamps

### Vercel Logs

- View cron job execution logs in Vercel dashboard
- Check for any errors in email sending

### Resend Dashboard

- View all sent emails
- Check delivery status
- Monitor bounce rates

---

## Customization

### Email Content

Edit `src/lib/email/trial-notification.ts` to customize:

- Email subject lines
- HTML templates
- From email address
- Button text and styling

### Notification Timing

Edit `src/app/api/cron/check-trials/route.ts` to change:

- When 48-hour notice is sent
- Additional notification triggers
- Notification conditions

### Cron Schedule

Edit `vercel-cron.json` to change frequency:

```json
{
  "schedule": "0 */6 * * *" // Run every 6 hours
}
```

---

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Verify in environment variables
2. **Domain Verification**: Ensure lifestacks.ai is verified in Resend
3. **Check Logs**: View Vercel function logs for errors
4. **Resend Dashboard**: Check for rejected emails

### Cron Not Running

1. **Check Vercel Cron**: Ensure `vercel-cron.json` is deployed
2. **CRON_SECRET**: Verify environment variable is set
3. **Manual Test**: Try manual trigger to test logic

### Notifications Not Tracking

1. **Database Fields**: Ensure notification fields exist in table
2. **RLS Policies**: Check Supabase policies allow updates
3. **Check Response**: Review API response for errors

---

## Security

- ✅ Cron endpoint protected by secret token
- ✅ Admin dashboard requires authentication
- ✅ RLS policies prevent unauthorized access
- ✅ Email message IDs stored for audit trail
- ✅ No sensitive data in email templates

---

## Future Enhancements

- [ ] Add SMS notifications (Twilio integration)
- [ ] Customize email templates per user language
- [ ] Send day-of-trial reminders (24h, 12h, 1h)
- [ ] A/B test email templates
- [ ] Track email open rates and clicks
- [ ] Add win-back emails for cancelled trials

---

## Support

For issues or questions:

- Check Vercel logs: `vercel logs`
- Check Supabase logs in dashboard
- Review Resend email logs
- Contact: support@lifestacks.ai
