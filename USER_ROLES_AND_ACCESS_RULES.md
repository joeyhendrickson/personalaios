# User Roles and Access Rules

## Overview

This document defines all user roles, access levels, subscription types, and business logic for the Life Stacks platform. This ensures consistent implementation and prevents security violations.

---

## User Roles

### 1. **Admin Users**

- **Database Table**: `admin_users`
- **Access Level**: Full platform access + admin dashboard
- **Trial Subscriptions**: ❌ **NEVER ALLOWED**
- **Grace Periods**: ❌ **NEVER ALLOWED**
- **Payment Requirements**: None (free access)
- **UI Indicators**: "Admin" button visible, no trial banners

**Rules:**

- Cannot create trial subscriptions (API + Database enforced)
- Cannot see trial banners (UI enforced)
- Cannot enter grace periods
- Have permanent full access regardless of payment status

### 2. **Trial Users**

- **Database Table**: `trial_subscriptions`
- **Access Level**: Full platform access for 7 days
- **Duration**: 7 days from account creation
- **Payment**: None required during trial
- **Post-Trial**: Must upgrade to Standard or Premium

**Rules:**

- Must upgrade before trial expires
- Cannot extend trial period
- Cannot have multiple trials
- Trial banner shows days remaining

### 3. **Standard Users**

- **Database Table**: `subscriptions` (plan_type = 'standard')
- **Access Level**: Full platform access
- **Payment**: $20.00/month via PayPal
- **Grace Period**: 7 days when payment fails
- **UI Indicators**: No trial banners (unless in grace period)

**Rules:**

- Pay monthly via PayPal subscription
- Get 7-day grace period when payment fails
- During grace period: Full access + payment reminder banner
- After grace period: Access revoked until payment fixed

### 4. **Premium Users**

- **Database Table**: `subscriptions` (plan_type = 'premium', is_admin_managed = true)
- **Access Level**: Full platform access + personal coaching
- **Payment**: **NO PAYPAL** - Admin-managed invoicing only
- **Grace Period**: ❌ **NO GRACE PERIOD** - Admin controls access directly
- **UI Indicators**: No trial banners, no payment reminders

**Rules:**

- **Admin provides access codes** for free account setup
- **Admin bills directly** via invoicing (not PayPal)
- **Admin controls access** via on/off toggle in admin dashboard
- **No automated payment system** - completely manual admin management
- **Access can be turned off/on instantly** by admin

---

## Access Flow Logic

### New User Journey

```
1. User visits /create-account
2. Chooses: Free Trial | Standard ($20/mo) | Premium (Contact Admin)
3. Creates account with email/password
4. Trial users: Get 7 days free access
5. Standard users: Redirected to PayPal checkout
6. Premium users: Contact admin directly, get access code for free setup
```

### Trial User Journey

```
1. Create trial account → 7 days access
2. Day 6-7: Trial banner warns of expiry
3. Day 8: Access revoked, redirected to upgrade page
4. Must choose Standard or Premium plan
5. Payment success → Convert to paid user
6. Payment failure → Account remains expired
```

### Standard User Journey

```
1. Monthly payment due
2. Payment success → Continue normal access
3. Payment fails → Enter 7-day grace period
4. Grace period: Full access + payment reminder banner
5. Payment fixed during grace → Resume normal billing
6. Grace period expires → Access revoked until payment fixed
```

### Premium User Journey (Admin-Managed)

```
1. User contacts admin for premium access
2. Admin provides access code for free account setup
3. User creates account with access code
4. Admin manually enables access via dashboard toggle
5. Admin bills user directly via invoicing
6. Admin can turn access on/off instantly as needed
7. No automated payments or grace periods
```

---

## Database Constraints

### Security Constraints

```sql
-- Prevent admin users from having trial subscriptions
ALTER TABLE trial_subscriptions
ADD CONSTRAINT no_admin_trials
CHECK (NOT is_admin_user(email));

-- Function to check admin status
CREATE FUNCTION is_admin_user(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = check_email AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Subscription Status Flow

```
active → past_due → grace_period → suspended
  ↑         ↓           ↓            ↓
  ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
   Payment Fixed
```

---

## API Security Rules

### Trial Creation API (`/api/trial/create`)

```typescript
// SECURITY CHECK: Prevent admin users
const adminUser = await supabase
  .from('admin_users')
  .select('email, role')
  .eq('email', email)
  .eq('is_active', true)
  .single()

if (adminUser) {
  return NextResponse.json(
    {
      error: 'Admin accounts cannot have trial subscriptions',
      securityViolation: true,
    },
    { status: 403 }
  )
}
```

### Trial Banner Component

```typescript
// SECURITY CHECK: Never show trial banner for admin users
const { isAdmin } = useAdminAuth()
if (isAdmin) {
  return null
}
```

---

## Payment Failure Handling

### PayPal Webhook Events

- `BILLING.SUBSCRIPTION.PAYMENT.FAILED` → Set status to `past_due`
- `PAYMENT.SALE.COMPLETED` → Set status to `active`
- `BILLING.SUBSCRIPTION.CANCELLED` → Set status to `cancelled`

### Grace Period Logic

```typescript
// When payment fails:
1. Set subscription.status = 'past_due'
2. Set grace_period_start = NOW()
3. Set grace_period_end = NOW() + 7 days
4. Send payment failure email
5. Show grace period banner on dashboard

// During grace period:
1. User has full access
2. Banner shows: "Payment failed - X days remaining"
3. Banner includes "Fix Payment" button

// After grace period:
1. Set subscription.status = 'suspended'
2. Revoke access
3. Redirect to payment page
```

---

## UI Components by User Type

### Admin Users

- ✅ Admin Dashboard button
- ✅ Full platform access
- ❌ No trial banners
- ❌ No payment reminders
- ❌ No upgrade prompts

### Trial Users

- ✅ Full platform access (7 days)
- ✅ Trial banner with days remaining
- ✅ Upgrade prompts
- ❌ No admin features

### Standard Users

- ✅ Full platform access
- ✅ Payment reminders (if past due)
- ✅ Grace period banner (if payment failed)
- ❌ No trial banners (unless in grace period)
- ❌ No admin features

### Premium Users

- ✅ Full platform access + coaching features
- ❌ No payment reminders (admin-managed)
- ❌ No grace period banners (admin-managed)
- ❌ No trial banners
- ❌ No admin features
- ✅ Access controlled by admin toggle

---

## Email Notifications

### Trial Users

- **Day 5**: "Your trial expires in 2 days"
- **Day 6**: "Your trial expires tomorrow"
- **Day 7**: "Your trial expires today"

### Standard Users

- **Payment Failed**: "Payment failed - you have 7 days to fix this"
- **Grace Day 5**: "Payment grace period expires in 2 days"
- **Grace Day 6**: "Payment grace period expires tomorrow"
- **Grace Day 7**: "Payment grace period expires today - access will be revoked"

### Premium Users

- **No automated emails** - Admin manages all communication
- **Admin sends invoices directly** via email/phone
- **Admin controls access** - no automated payment reminders

---

## Testing Scenarios

### Security Tests

1. **Admin Trial Creation**: Admin user tries to create trial → Should fail with 403
2. **Admin Trial Banner**: Admin user should never see trial banners
3. **Multiple Trials**: User tries to create second trial → Should fail
4. **Trial Extension**: User tries to extend trial → Should fail

### Payment Flow Tests

1. **New Trial User**: Creates account → Gets 7 days access
2. **Trial Expiry**: Trial expires → Access revoked, redirected to upgrade
3. **Payment Success**: User pays → Gets full access
4. **Payment Failure**: Payment fails → Enters 7-day grace period
5. **Grace Period**: User has full access + payment reminders
6. **Grace Expiry**: Grace period ends → Access revoked until payment fixed

---

## Emergency Procedures

### If Admin User Has Trial Subscription

1. Run cleanup script: `CLEANUP-ADMIN-TRIAL-SUBSCRIPTIONS.sql`
2. Verify admin user has no trial records
3. Check for security violations in logs
4. Test admin access is not affected

### If User Has Multiple Subscriptions

1. Identify duplicate records
2. Keep most recent subscription
3. Mark older subscriptions as cancelled
4. Ensure proper billing continuity

---

## Implementation Checklist

- [ ] Database constraints in place
- [ ] API security checks implemented
- [ ] UI components respect user roles
- [ ] Email notifications configured
- [ ] Payment webhooks working
- [ ] Grace period logic implemented
- [ ] Trial expiry handling working
- [ ] Admin access properly secured
- [ ] Cleanup scripts available
- [ ] Documentation up to date

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Next Review**: [30 days from current date]
