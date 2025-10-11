# Trial Expiry Flow - Complete Documentation

## How Trial Expiry Works

### 1. **Trial Creation**

- User signs up for 7-day free trial
- Record created in `trial_subscriptions` table:
  - `trial_start`: NOW()
  - `trial_end`: NOW() + 7 days
  - `status`: 'active'

### 2. **During Trial (Days 1-7)**

- User can access dashboard normally
- Middleware checks: `trial_end > NOW()` AND `status = 'active'`
- Trial banner shows days remaining
- Email notifications sent at 48h and 24h before expiry

### 3. **Trial Expires (Day 8+)**

**Database Changes:**

- Cron job runs daily (`expire_old_trials()` function)
- Updates `trial_subscriptions`:
  - `status`: 'expired'
  - `updated_at`: NOW()

**User Tries to Access Dashboard:**

1. User logs in successfully (auth still works)
2. Middleware checks subscription via `checkUserAccess()`
3. Finds: `trial_end <= NOW()` or `status = 'expired'`
4. Returns: `{ hasAccess: false, subscriptionType: 'expired' }`
5. **Middleware redirects** to: `/create-account?expired=true&email=user@example.com`

**On Create Account Page:**

- Shows orange banner: "⏰ Your 7-day free trial has ended"
- Message: "Continue your journey! Upgrade to Standard Plan to keep your progress"
- Automatically selects Standard Plan
- Email pre-filled from URL parameter
- User can't access trial option (it's expired)

### 4. **User Upgrades**

- User subscribes to Standard Plan via PayPal
- `subscriptions` table record created:
  - `user_id`: user's ID
  - `plan_type`: 'standard'
  - `status`: 'active'
- User regains dashboard access
- All their data is preserved (tasks, goals, habits, etc.)

### 5. **What Data is Kept**

Even with expired trial, these tables retain user data:

- ✅ `profiles` - name, email
- ✅ `tasks` - all tasks
- ✅ `goals` - all goals
- ✅ `habits` - daily habits
- ✅ `priorities` - priorities
- ✅ `projects` - projects
- ✅ `points_ledger` - points earned
- ✅ `user_analytics_summary` - analytics
- ✅ `user_activity_logs` - activity history

**Nothing is deleted!** Data is waiting for them when they upgrade.

## Technical Implementation

### Database Functions

```sql
-- Expires old trials (runs daily)
expire_old_trials()

-- Check user's plan status
get_user_plan(email) RETURNS (plan_type, status, days_remaining)
```

### Middleware Logic (`src/middleware.ts`)

```typescript
if (user && !hasAccess && accessStatus.subscriptionType === 'expired') {
  // Redirect to upgrade page
  return NextResponse.redirect('/create-account?expired=true&email=...')
}
```

### Access Control (`src/lib/access-control.ts`)

```typescript
// Checks trial_subscriptions for active trial
if (now < trialEnd && status === 'active') {
  return { hasAccess: true, subscriptionType: 'trial' }
} else {
  return { hasAccess: false, subscriptionType: 'expired' }
}
```

## SQL Scripts to Run

### 1. Drop the problematic trigger

```sql
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;
```

### 2. Fix subscriptions table structure

Run: `fix-subscriptions-table.sql`

### 3. Set up user plan tracking

Run: `setup-user-plan-tracking.sql`

### 4. Set up trial expiry automation

Run: `create-trial-expiry-cron.sql`

## Testing the Flow

### Test Expired Trial:

1. Create a trial account
2. Manually expire it in database:
   ```sql
   UPDATE trial_subscriptions
   SET trial_end = NOW() - INTERVAL '1 day', status = 'expired'
   WHERE email = 'test@example.com';
   ```
3. Try to access dashboard
4. Should redirect to `/create-account?expired=true`
5. Should see orange "Trial Expired" banner
6. Should have Standard plan pre-selected

## User Experience

**For Users:**

- ✅ Clear messaging when trial expires
- ✅ Easy upgrade path
- ✅ All data is preserved
- ✅ No loss of progress
- ✅ Seamless transition to paid plan

**For Admins:**

- ✅ Can see all users and their plan types in admin dashboard
- ✅ Can track trial → standard conversions
- ✅ Can see which trials are expiring soon
- ✅ Automated expiry handling (no manual work)
