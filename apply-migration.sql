-- Apply the new goal categories migration
-- Run this in your Supabase SQL Editor

-- Add new enum values to the existing goal_category enum
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'quick_money';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'save_money';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'network_expansion';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'business_growth';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'fires';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'good_living';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'big_vision';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'job';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'organization';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'tech_issues';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'business_launch';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'future_planning';
ALTER TYPE goal_category ADD VALUE IF NOT EXISTS 'innovation';

-- Verify the enum now has all expected values
SELECT unnest(enum_range(NULL::goal_category)) as category;

