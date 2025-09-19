-- Update the goal_category enum to include all new categories
-- First, we need to backup the existing data and recreate the enum

-- Create a temporary column to store the old category values
ALTER TABLE weekly_goals ADD COLUMN category_backup TEXT;

-- Copy existing category values to the backup column
UPDATE weekly_goals SET category_backup = category::TEXT;

-- Drop the existing enum (this will also drop the column constraint)
ALTER TABLE weekly_goals DROP CONSTRAINT IF EXISTS weekly_goals_category_check;
DROP TYPE IF EXISTS goal_category CASCADE;

-- Create the new enum with all categories
CREATE TYPE goal_category AS ENUM (
  'quick_money',
  'save_money', 
  'health',
  'network_expansion',
  'business_growth',
  'fires',
  'good_living',
  'big_vision',
  'job',
  'organization',
  'tech_issues',
  'business_launch',
  'future_planning',
  'innovation',
  'other'
);

-- Drop the old category column
ALTER TABLE weekly_goals DROP COLUMN category;

-- Add the new category column with the new enum type
ALTER TABLE weekly_goals 
ADD COLUMN category goal_category NOT NULL DEFAULT 'other';

-- Copy data from backup column, mapping old values to new ones
UPDATE weekly_goals SET category = 
  CASE 
    WHEN category_backup = 'health' THEN 'health'::goal_category
    WHEN category_backup = 'productivity' THEN 'business_growth'::goal_category
    WHEN category_backup = 'learning' THEN 'innovation'::goal_category
    WHEN category_backup = 'financial' THEN 'save_money'::goal_category
    WHEN category_backup = 'personal' THEN 'good_living'::goal_category
    WHEN category_backup = 'other' THEN 'other'::goal_category
    ELSE 'other'::goal_category
  END;

-- Drop the backup column
ALTER TABLE weekly_goals DROP COLUMN category_backup;

-- Add a comment to document the categories
COMMENT ON TYPE goal_category IS 'Categories for goals: quick_money, save_money, health, network_expansion, business_growth, fires, good_living, big_vision, job, organization, tech_issues, business_launch, future_planning, innovation, other';
