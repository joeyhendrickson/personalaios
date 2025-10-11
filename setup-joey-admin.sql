-- Quick Admin Setup for Joseph
-- Run this in your Supabase SQL editor

-- Remove old admin account
DELETE FROM admin_users WHERE email = 'joeyhendrickson@me.com';

-- Add Joseph as super admin
INSERT INTO admin_users (email, name, role, is_active) 
VALUES ('josephgregoryhendrickson@gmail.com', 'Joseph Hendrickson', 'super_admin', true)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- Verify it worked
SELECT email, role, is_active FROM admin_users WHERE email = 'josephgregoryhendrickson@gmail.com';
