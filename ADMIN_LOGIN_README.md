# 🔐 Admin Login System

## Overview

The admin login system allows authorized users to access the admin dashboard with comprehensive user analytics and management features.

## 🚀 How to Set Up Admin Access

### Step 1: Create a Regular User Account

1. Go to `http://localhost:3000`
2. Click "Create Account"
3. Sign up with your email and password
4. Verify your email if required

### Step 2: Grant Admin Privileges

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the `setup-admin.sql` script
4. Replace `joeyhendrickson@gmail.com` with your actual email address

### Step 3: Access Admin Dashboard

1. Go to `http://localhost:3000/admin/login`
2. Sign in with your regular user credentials
3. You'll be automatically redirected to the admin dashboard

## 🔑 Admin Login Flow

```
User visits /admin/login
    ↓
Enters email/password
    ↓
System authenticates via Supabase Auth
    ↓
Checks if user has admin privileges in admin_users table
    ↓
If admin: Redirect to /admin dashboard
If not admin: Redirect to /dashboard with error
```

## 🛡️ Security Features

- **Authentication Required**: Must be logged in via Supabase Auth
- **Admin Role Check**: Must have entry in `admin_users` table
- **Automatic Redirects**: Non-admin users redirected to regular dashboard
- **Session Management**: Uses existing Supabase session system

## 📊 Admin Dashboard Features

- **User Analytics**: Total users, active users, engagement metrics
- **Real-time Activity**: Recent user actions and page visits
- **User Management**: Complete user list with analytics
- **New User Tracking**: 24-hour new user monitoring
- **Performance Metrics**: System usage and activity insights

## 🔧 Technical Implementation

### Files Created/Modified:

- `src/app/admin/login/page.tsx` - Admin login page
- `src/app/admin/page.tsx` - Updated with auth checks
- `src/app/page.tsx` - Added admin login link
- `setup-admin.sql` - Admin setup script

### Key Components:

- **Admin Login Page**: Dedicated login form for admin access
- **Auth Integration**: Uses existing `useAuth` and `useAdminAuth` hooks
- **Automatic Redirects**: Smart routing based on user permissions
- **Error Handling**: Clear feedback for unauthorized access

## 🚨 Troubleshooting

### "Admin access required" error:

- Make sure you've run the `setup-admin.sql` script
- Verify your email is in the `admin_users` table
- Check that your role is set to 'admin' or 'super_admin'

### Can't access admin dashboard:

- Ensure you're signed in as a regular user first
- Check that your email matches exactly in both `auth.users` and `admin_users`
- Try signing out and signing back in

### Admin link not showing:

- The admin link only appears for users with admin privileges
- Make sure you've completed the admin setup process

## 📝 Next Steps

1. **Test the login flow** with your admin account
2. **Explore the admin dashboard** features
3. **Monitor user activity** and engagement
4. **Create additional admin users** if needed

## 🔗 Quick Links

- **Admin Login**: `http://localhost:3000/admin/login`
- **Admin Dashboard**: `http://localhost:3000/admin`
- **Regular Dashboard**: `http://localhost:3000/dashboard`
- **Main App**: `http://localhost:3000`

---

**Your admin system is now ready to monitor and manage all user activity!** 🎉
