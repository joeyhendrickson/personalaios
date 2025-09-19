-- Setup script to create your first admin user
-- Replace 'your-email@example.com' with your actual email address

-- Insert yourself as a super admin
INSERT INTO admin_users (email, name, role) 
VALUES ('joeyhendrickson@gmail.com', 'Joey Hendrickson', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- Verify the admin user was created
SELECT * FROM admin_users WHERE email = 'joeyhendrickson@gmail.com';

-- Check if the trigger is working by looking at existing users
SELECT 
  u.email,
  u.created_at,
  ua.total_visits,
  ua.first_visit,
  ua.last_visit
FROM auth.users u
LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
ORDER BY u.created_at DESC
LIMIT 10;
