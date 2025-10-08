-- Insert default project categories for all existing users
-- This adds the standard project categories that were previously hardcoded

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    -- Insert default categories for each user (if they don't already exist)
    INSERT INTO dashboard_categories (user_id, name, description, color, sort_order, is_default)
    VALUES
      (user_record.id, 'Quick Money', 'Projects that generate immediate income', '#EF4444', 1, TRUE),
      (user_record.id, 'Save Money', 'Projects focused on reducing expenses', '#6B7280', 2, TRUE),
      (user_record.id, 'Health', 'Health and wellness projects', '#F97316', 3, TRUE),
      (user_record.id, 'Network Expansion', 'Building professional and personal connections', '#4B5563', 4, TRUE),
      (user_record.id, 'Business Growth', 'Growing existing business ventures', '#10B981', 5, TRUE),
      (user_record.id, 'Fires', 'Urgent issues requiring immediate attention', '#DC2626', 6, TRUE),
      (user_record.id, 'Good Living', 'Quality of life improvements', '#EAB308', 7, TRUE),
      (user_record.id, 'Big Vision', 'Long-term aspirational projects', '#6366F1', 8, TRUE),
      (user_record.id, 'Job', 'Career and employment related', '#6B7280', 9, TRUE),
      (user_record.id, 'Organization', 'Systems and structure improvements', '#14B8A6', 10, TRUE),
      (user_record.id, 'Tech Issues', 'Technology problems and solutions', '#06B6D4', 11, TRUE),
      (user_record.id, 'Business Launch', 'New business ventures', '#EC4899', 12, TRUE),
      (user_record.id, 'Future Planning', 'Strategic planning for the future', '#8B5CF6', 13, TRUE),
      (user_record.id, 'Innovation', 'Creative and innovative projects', '#10B981', 14, TRUE),
      (user_record.id, 'Productivity', 'Efficiency and productivity improvements', '#22C55E', 15, TRUE),
      (user_record.id, 'Learning', 'Educational pursuits and skill development', '#4B5563', 16, TRUE),
      (user_record.id, 'Financial', 'Financial planning and management', '#6B7280', 17, TRUE),
      (user_record.id, 'Personal', 'Personal development and growth', '#EC4899', 18, TRUE),
      (user_record.id, 'Other', 'Miscellaneous projects', '#9CA3AF', 19, TRUE)
    ON CONFLICT (user_id, name) DO NOTHING;
  END LOOP;
END $$;

