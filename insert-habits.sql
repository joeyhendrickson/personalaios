-- Insert daily habits for the user
-- Run this in Supabase SQL Editor

-- Note: You'll need to replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can find your user ID by running: SELECT id FROM auth.users LIMIT 1;

INSERT INTO daily_habits (user_id, title, description, points_per_completion, is_active) VALUES
-- Replace 'YOUR_USER_ID' with your actual user ID
('YOUR_USER_ID', 'DuoLingo Daily for 1 Week', 'Complete daily DuoLingo lessons for language learning', 50, true),
('YOUR_USER_ID', 'No Drama - Avoid Judging', 'Get better at not judging and each day without conflict', 50, true),
('YOUR_USER_ID', 'Sobriety', 'Maintain sobriety daily', 50, true),
('YOUR_USER_ID', 'Stock Market Net Positive', 'Achieve net positive $500 per week in stock market', 25, true),
('YOUR_USER_ID', 'Gym Workout', 'Workout at Smart Fit or Apartment Gym', 75, true),
('YOUR_USER_ID', 'Job Applications', 'Submit 2 job applications each day', 50, true),
('YOUR_USER_ID', 'Grocery Shopping and Saving Money', 'Shop for groceries while saving money', 50, true),
('YOUR_USER_ID', 'Cook Meals', 'Cook at least 2 meals', 50, true),
('YOUR_USER_ID', 'Sleep Before Midnight', 'Go to bed before midnight', 25, true);

-- Verify the habits were inserted
SELECT id, title, points_per_completion, created_at 
FROM daily_habits 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at;
