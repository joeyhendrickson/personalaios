-- Add joeyhendrickson@me.com as admin user
INSERT INTO admin_users (email, name, role) 
VALUES ('joeyhendrickson@me.com', 'Joey Hendrickson', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = NOW();

