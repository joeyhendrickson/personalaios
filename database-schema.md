# Database Schema - Current State

## Overview
This document tracks the current state of the Personal AI OS database schema, including all tables, relationships, and recent changes.

## Core Tables

### 1. `weeks` table
**Purpose**: Tracks weekly periods for goal and task organization
```sql
CREATE TABLE weeks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_start, week_end)
);
```

### 2. `weekly_goals` table (Projects)
**Purpose**: Stores current weekly projects (previously called "goals")
```sql
CREATE TABLE weekly_goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category goal_category NOT NULL DEFAULT 'other',
    target_points INTEGER NOT NULL DEFAULT 0,
    target_money DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    current_points INTEGER NOT NULL DEFAULT 0,
    current_money DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `tasks` table
**Purpose**: Stores individual tasks that can be linked to projects
```sql
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    weekly_goal_id UUID REFERENCES weekly_goals(id) ON DELETE CASCADE, -- Made optional
    user_id UUID NOT NULL, -- Linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category goal_category NOT NULL DEFAULT 'other', -- Added in migration 007
    points_value INTEGER NOT NULL DEFAULT 0,
    money_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status task_status NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. `goals` table (High-Level Goals)
**Purpose**: Stores high-level weekly/monthly/yearly objectives
```sql
CREATE TABLE goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL DEFAULT 'weekly', -- weekly, monthly, quarterly, yearly
    target_value DECIMAL(10,2),
    target_unit VARCHAR(50),
    current_value DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, paused, cancelled
    priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5),
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. `priorities` table
**Purpose**: Stores AI-recommended and manual priorities
```sql
CREATE TABLE priorities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Linked to auth.users
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority_type VARCHAR(20) NOT NULL DEFAULT 'manual', -- manual, ai_recommended, fire_auto
    priority_score INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. `points_ledger` table
**Purpose**: Tracks all point transactions for accomplishments
```sql
CREATE TABLE points_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Linked to auth.users
    weekly_goal_id UUID REFERENCES weekly_goals(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    points INTEGER NOT NULL, -- Can be positive or negative
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. `audit_logs` table
**Purpose**: Tracks system changes and user actions
```sql
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- Linked to auth.users
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Custom Types

### `goal_category` enum
**Current values** (19 total):
- `health`
- `productivity` 
- `learning`
- `financial`
- `personal`
- `other`
- `quick_money`
- `save_money`
- `network_expansion`
- `business_growth`
- `fires`
- `good_living`
- `big_vision`
- `job`
- `organization`
- `tech_issues`
- `business_launch`
- `future_planning`
- `innovation`

### `task_status` enum
- `pending`
- `completed`
- `cancelled`

### `ledger_type` enum
- `points`
- `money`

## API Endpoints

### Projects (weekly_goals)
- `GET /api/projects` - Fetch all projects for current user
- `POST /api/projects` - Create new project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `PATCH /api/projects/[id]/progress` - Update project progress

### Goals (high-level)
- `GET /api/goals` - Fetch all high-level goals
- `POST /api/goals` - Create new high-level goal
- `PATCH /api/goals/[id]` - Update high-level goal
- `DELETE /api/goals/[id]` - Delete high-level goal

### Tasks
- `GET /api/tasks` - Fetch all tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `PATCH /api/tasks/[id]/complete` - Mark task as completed

### Priorities
- `GET /api/priorities` - Fetch all priorities
- `POST /api/priorities` - Create new priority
- `PATCH /api/priorities/[id]` - Update priority
- `DELETE /api/priorities/[id]` - Delete priority

## Recent Changes

### Migration 005: Add New Goal Categories
- Added 13 new categories to `goal_category` enum
- Applied via `apply-migration.sql`

### Migration 006: Create Goals Table
- Created `goals` table for high-level objectives
- Added RLS policies

### Migration 007: Create Priorities Table & Add Category to Tasks
- Created `priorities` table for AI-recommended priorities
- Added `category` column to `tasks` table
- Made `weekly_goal_id` optional in `tasks` table

## Dashboard Section Hierarchy
1. **Priorities** - AI-recommended and manual priorities
2. **Goals** - High-level weekly/monthly objectives  
3. **Projects** - Current weekly projects (weekly_goals)
4. **Tasks** - Individual actionable steps

## Data Flow
- **Goals** → High-level objectives (weekly/monthly/yearly)
- **Projects** → Weekly implementations of goals
- **Tasks** → Individual steps to complete projects
- **Priorities** → AI-recommended focus areas based on goals
- **Points Ledger** → Tracks all point transactions from progress/completions