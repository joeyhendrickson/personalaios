# Trophy Systems Documentation

This document describes the three trophy systems implemented in the Personal AI OS to reward user engagement and consistency.

## Overview

The platform now has three distinct trophy systems:

1. **Sign-In Streak Trophies** - Rewards daily sign-ins
2. **Total Habit Completion Trophies** - Rewards cumulative habit completions
3. **Discipline Trophies** (existing) - Rewards per-habit consistency

## 1. Sign-In Streak Trophies

### Purpose

Reward users for showing up daily, regardless of whether they complete any habits or tasks.

### Database Tables

#### `signin_streak_trophies`

- Defines the available trophies and their requirements
- Requirements: 1, 2, 3, 7, 14, 30, 90, 365 days

#### `user_signin_streaks`

- Tracks each user's streak information
- Fields: `current_streak`, `longest_streak`, `total_signins`, `last_signin_date`

#### `user_signin_streak_trophies`

- Junction table linking users to earned trophies

#### `daily_signin_logs`

- Detailed log of each sign-in event
- Tracks IP address and user agent for analytics

### API Endpoints

- `POST /api/signin-streak/track` - Track daily sign-in and award trophies
- `GET /api/signin-streak/track` - Get current streak information
- `GET /api/signin-streak/trophies` - Get all trophies and user's earned trophies

### Trophy Levels

1. **The First Light** (1 day) - First step on the journey
2. **The Dedicated Visitor** (2 days) - Building reliability
3. **The Steady Presence** (3 days) - Proving dependability
4. **The Weekly Warrior** (7 days) - Full week of dedication
5. **The Fortnight Faithful** (14 days) - Two weeks of consistency
6. **The Monthly Master** (30 days) - A full month of presence
7. **The Quarter Champion** (90 days) - Three months of dedication
8. **The Yearly Sage** (365 days) - A full year of presence

### Integration Points

- Should be called on user authentication/first page load
- Component: `src/components/trophies/signin-streak-trophies.tsx`

---

## 2. Total Habit Completion Trophies

### Purpose

Reward users for their cumulative habit completions across all habits, celebrating overall consistency.

### Database Tables

#### `total_habit_trophies`

- Defines available trophies and requirements
- Requirements: 1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000 completions

#### `user_total_habit_trophies`

- Junction table linking users to earned trophies
- Includes `total_completions_at_time` to show progress when earned

### API Endpoints

- `GET /api/total-habit-trophies` - Get all trophies and user's progress
- `POST /api/total-habit-trophies/check-achievements` - Check and award new trophies

### Trophy Levels

1. **The First Mark** (1 completion) - First habit completed
2. **The Eager Builder** (5 completions) - Building momentum
3. **The Consistent One** (10 completions) - Consistency forming
4. **The Dedicated Worker** (25 completions) - Undeniable dedication
5. **The Habit Champion** (50 completions) - Champion of action
6. **The Centennial Master** (100 completions) - Significant milestone
7. **The Relentless Spirit** (250 completions) - Unwavering commitment
8. **The Legendary Achiever** (500 completions) - Legendary status
9. **The Mythic Master** (1000 completions) - Transcendent achievement
10. **The Eternal Sage** (2000 completions) - Embodiment of consistency

### Integration Points

- Automatically checked after each habit completion
- Integrated into `POST /api/habits/[id]/complete`
- Component: `src/components/trophies/total-habit-trophies.tsx`

---

## 3. Discipline Trophies (Per-Habit)

### Purpose

Reward users for consistency with individual habits. Each habit tracks its own completion count.

### Database Tables

#### `discipline_trophies`

- Defines available trophies and requirements
- Requirements: 5, 10, 20, 30, 40, 50, 75, 100 completions per habit
- **Note**: These should be updated to more attainable levels (1, 3, 5, 7, 10, 15, 21, 30)

#### `user_discipline_trophies`

- Junction table linking users to earned trophies for specific habits
- Includes `habit_id` to track which habit earned the trophy

### API Endpoints

- `GET /api/discipline-trophies` - Get all trophies and user's earned trophies
- `POST /api/discipline-trophies/check-achievements` - Check and award trophies for a specific habit

### Integration Points

- Should be checked after each habit completion
- Currently tracks via `daily_habit_completions` and `habit_completions` tables
- Component: `src/components/discipline/discipline-trophies.tsx`

---

## Migration Files

### Sign-In Streak System

```sql
create-signin-streak-trophies.sql
```

Creates all tables and policies for sign-in tracking.

### Total Habit Completion System

```sql
create-total-habit-completion-trophies.sql
```

Creates tables for tracking cumulative habit completions.

### Discipline Trophy Updates (Pending)

```sql
update-discipline-trophies-attainable.sql
```

Updates discipline trophy requirements to be more attainable.

---

## Implementation Status

### ✅ Completed

- Sign-in streak trophy database schema
- Sign-in streak trophy API endpoints
- Sign-in streak trophy UI component
- Total habit completion trophy database schema
- Total habit completion trophy API endpoints
- Total habit completion trophy UI component
- Integration into habit completion flow
- Profile page display for all trophy types

### ⏳ Pending

- Sign-in tracking integration into authentication flow
- Running database migrations
- Discipline trophy requirement updates (make more attainable)

---

## Usage Instructions

### To Run Database Migrations

You'll need to execute these SQL files against your Supabase database:

```bash
# 1. Sign-In Streak Trophies
psql $DATABASE_URL -f create-signin-streak-trophies.sql

# 2. Total Habit Completion Trophies
psql $DATABASE_URL -f create-total-habit-completion-trophies.sql

# 3. Update Discipline Trophies (Optional but Recommended)
psql $DATABASE_URL -f update-discipline-trophies-attainable.sql
```

### To Integrate Sign-In Tracking

Add this to your authentication flow or main layout:

```typescript
// In your layout.tsx or auth callback
useEffect(() => {
  const trackSignin = async () => {
    try {
      await fetch('/api/signin-streak/track', { method: 'POST' })
    } catch (error) {
      console.error('Failed to track sign-in:', error)
    }
  }

  if (user) {
    trackSignin()
  }
}, [user])
```

---

## User Experience

### Profile Section

The profile page now displays three trophy sections:

1. **Sign-In Streak Trophies** (left column)
   - Shows current streak, longest streak, and total sign-ins
   - Displays earned trophies with inspirational messages
   - Shows progress toward next trophy

2. **Total Habit Completion Trophies** (right column)
   - Shows total habit completions across all habits
   - Displays earned trophies with milestone information
   - Shows progress toward next trophy

3. **Discipline Trophies** (full width below)
   - Shows per-habit progress and trophies
   - Displays each habit with its completion count
   - Shows progress toward next trophy for each habit

### Trophy Display Features

- Beautiful gradient backgrounds
- Colored icons matching trophy theme
- Inspirational reflection messages
- Progress bars for upcoming trophies
- Locked/unlocked state visualization
- Earned dates for each trophy

---

## Design Philosophy

Each trophy system serves a different psychological purpose:

1. **Sign-In Streaks**: Reward presence and consistency
2. **Total Habit Completions**: Reward overall progress and accumulation
3. **Discipline Trophies**: Reward mastery of individual habits

Together, they create a comprehensive gamification system that motivates users at multiple levels of engagement.

---

## Next Steps

1. Run the database migrations
2. Integrate sign-in tracking into the authentication flow
3. Test trophy awarding logic
4. Update discipline trophy requirements to be more attainable
5. Consider adding trophy notifications/celebrations when earned
6. Add trophy analytics to track user engagement
