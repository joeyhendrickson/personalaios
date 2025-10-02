# Personal AI OS - Database Catalog

## Current Database Tables (as of 2025-09-20)

### Core Tables

- `admin_users` - Admin user accounts
- `audit_logs` - System audit trail
- `daily_habits` - Daily habit definitions
- `education_completions` - Education item completions
- `education_items` - Education item definitions
- `goals` - User goals (NOT weekly_goals)
- `habit_completions` - Habit completion records
- `money_ledger` - Financial transactions
- `points_ledger` - Points earned/spent
- `priorities` - User priorities
- `progress_snapshots` - Progress tracking
- `tasks` - User tasks
- `user_activity_logs` - User activity tracking
- `user_analytics_summary` - Aggregated user analytics
- `user_dashboard_data` - Dashboard data view
- `user_profiles` - User profile information
- `user_sessions` - User session tracking
- `weekly_goals` - Weekly goal definitions
- `weekly_rollover_logs` - Weekly rollover tracking
- `weeks` - Week definitions

## Data Counts (as of 2025-09-20)

- tasks: 15
- goals: 4
- points_ledger: 16
- user_activity_logs: 74
- admin_users: 1
- user_analytics_summary: 3
- user_sessions: 0
- weeks: 1
- priorities: 5
- education_items: 20
- daily_habits: 9
- user_dashboard_data: 3

## User IDs Found

- 94a93832-cd8e-47fe-aeae-dbd945557f79 (primary user)
- 90779c8f-2a2c-4aa8-ac92-3c98fef3c8dc (from activity logs)
- 479218be-86cd-4754-9143-09a7a24b877d (from activity logs)

## Admin Users

- josephgregoryhendrickson@gmail.com (super_admin)

## Known Issues

1. `goals.is_completed` column does not exist - need to check actual column names
2. Admin dashboard queries returning 0 data - likely RLS policy or column name issues
3. `get_all_users_with_analytics.created_at` column does not exist

## Next Steps

1. Get actual column structure for `goals` table
2. Check RLS policies for admin access to user data
3. Verify column names in all tables being queried
4. Test data access with correct column names

## API Endpoints Status

- `/api/admin/dashboard` - Returns data but with 0 values due to column/RLS issues
- `/api/admin/check-status` - Working correctly
- `/api/admin/new-users` - 500 error due to missing column
- `/api/projects` - 500 error due to missing week data
