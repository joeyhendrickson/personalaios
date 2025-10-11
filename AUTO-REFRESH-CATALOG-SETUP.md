# Auto-Refresh Data Catalog Setup

## Overview

The admin dashboard now automatically refreshes the raw data catalog every 3 days to keep track of database changes and provide a persistent reference.

## What Was Built

### 1. Enhanced Raw Data API (`/api/admin/raw-data`)

- ✅ **Timestamp tracking** - Shows when data was last updated
- ✅ **Next refresh scheduling** - Shows when next auto-refresh will happen
- ✅ **Metadata section** - Version, table count, refresh source
- ✅ **3-day refresh cycle** - Automatically calculates next refresh date

### 2. Cron Job API (`/api/admin/refresh-catalog`)

- ✅ **Automated endpoint** - Called by Vercel cron every 3 days
- ✅ **Security** - Requires `CRON_SECRET` environment variable
- ✅ **Full data refresh** - Updates all table structures and user classifications
- ✅ **Error handling** - Logs failures and provides detailed error messages

### 3. Vercel Cron Configuration (`vercel.json`)

- ✅ **Schedule**: `0 0 */3 * *` (every 3 days at midnight UTC)
- ✅ **Endpoint**: `/api/admin/refresh-catalog`
- ✅ **Automatic deployment** - Runs on production Vercel instance

### 4. Enhanced Admin Dashboard

- ✅ **Refresh status display** - Shows last updated, next refresh, version
- ✅ **Manual refresh button** - "Refresh Now" for immediate updates
- ✅ **Auto-refresh indicator** - Shows the 3-day cycle information
- ✅ **Metadata filtering** - Hides metadata from table display

## Environment Variables Required

Add this to your `.env.local` and Vercel environment:

```bash
# Required for cron job security
CRON_SECRET=your-secure-random-string-here
```

**Generate a secure secret:**

```bash
openssl rand -base64 32
```

## How It Works

### Automatic Refresh Cycle

1. **Every 3 days at midnight UTC**, Vercel calls `/api/admin/refresh-catalog`
2. **Cron job fetches fresh data** from all Supabase tables
3. **Updates catalog with new timestamp** and next refresh date
4. **Logs success/failure** for monitoring

### Manual Refresh

1. **Click "Refresh Now"** button in admin dashboard
2. **Immediately fetches fresh data** from Supabase
3. **Updates timestamp** and next refresh schedule
4. **Real-time update** of the data catalog

### Data Catalog Contents

- **Auth Users** - All authentication users (source of truth)
- **Profiles** - User profile information
- **Admin Users** - Admin account details
- **Trial Subscriptions** - Free trial users
- **Standard Subscriptions** - Paid subscribers
- **User Activity Logs** - Activity tracking data
- **User Analytics Summary** - Aggregated analytics
- **User Classification** - Current user type breakdown

## Benefits

### For Development

- ✅ **Always current data structure** - Never lose track of table changes
- ✅ **Historical reference** - Can see what changed over time
- ✅ **Debugging aid** - Quick reference for table structures
- ✅ **User classification tracking** - Monitor user type changes

### For Monitoring

- ✅ **Automatic updates** - No manual intervention needed
- ✅ **Error logging** - Failed refreshes are logged
- ✅ **Version tracking** - Can track catalog version changes
- ✅ **Schedule visibility** - Always know when next refresh happens

## Testing

### Test Manual Refresh

1. Go to admin dashboard
2. Click "Raw Data" button
3. Click "Refresh Now" button
4. Verify timestamp updates

### Test Cron Job (Local)

```bash
# Test the cron endpoint manually
curl -X GET "http://localhost:3000/api/admin/refresh-catalog" \
  -H "Authorization: Bearer your-cron-secret"
```

### Verify Vercel Deployment

1. Deploy to Vercel
2. Check Vercel dashboard for cron job status
3. Wait 3 days or manually trigger in Vercel dashboard

## Troubleshooting

### Cron Job Not Running

- ✅ Check `CRON_SECRET` environment variable in Vercel
- ✅ Verify `vercel.json` is deployed correctly
- ✅ Check Vercel function logs for errors

### Data Not Updating

- ✅ Check Supabase connection in cron job logs
- ✅ Verify admin authentication in cron job
- ✅ Check for RLS policy issues

### Manual Refresh Failing

- ✅ Check browser console for errors
- ✅ Verify admin authentication
- ✅ Check network tab for API response

## Next Steps

1. **Set up CRON_SECRET** environment variable in Vercel
2. **Deploy to production** to activate the cron job
3. **Monitor first automatic refresh** in 3 days
4. **Use as reference** when making database changes

The system is now fully automated and will keep your data catalog fresh every 3 days! 🎉
