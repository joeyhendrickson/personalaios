-- Create 20 default rewards with minimum 500 points each
-- These rewards are designed to be meaningful and motivating

-- Insert 20 premium rewards with minimum 500 points
INSERT INTO rewards (category_id, name, description, point_cost) VALUES
-- Self-Care Rewards (5)
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Luxury Spa Day', 'Full day at a premium spa with massage, facial, and relaxation treatments', 1500),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Weekend Retreat', 'Book a weekend wellness retreat or meditation getaway', 2500),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Professional Massage Series', 'Book 3 professional massages over the next month', 1200),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Personal Chef Experience', 'Hire a personal chef for a special dinner at home', 2000),
((SELECT id FROM reward_categories WHERE name = 'Self-Care'), 'Premium Skincare Set', 'Invest in a high-quality skincare routine and products', 800),

-- Learning Rewards (4)
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Professional Certification Course', 'Enroll in a professional certification program in your field', 3000),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Masterclass Annual Subscription', 'Get unlimited access to Masterclass for a full year', 1000),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Conference Attendance', 'Attend a major industry conference or summit', 2500),
((SELECT id FROM reward_categories WHERE name = 'Learning'), 'Private Tutoring Sessions', 'Book 5 one-on-one tutoring sessions in a subject of your choice', 1500),

-- Experience Rewards (4)
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Weekend City Break', 'Plan a weekend getaway to a city you''ve always wanted to visit', 2000),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Concert VIP Experience', 'Get VIP tickets to see your favorite artist with backstage access', 1800),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Adventure Sports Day', 'Try skydiving, bungee jumping, or another thrilling adventure sport', 1200),
((SELECT id FROM reward_categories WHERE name = 'Experiences'), 'Wine Tasting Tour', 'Go on a premium wine tasting tour with transportation included', 1500),

-- Health & Fitness Rewards (3)
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Personal Trainer Package', 'Get 10 sessions with a certified personal trainer', 2000),
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Premium Gym Membership', 'Upgrade to premium gym membership with classes and amenities', 1000),
((SELECT id FROM reward_categories WHERE name = 'Health & Fitness'), 'Health Assessment & Plan', 'Get a comprehensive health assessment and personalized wellness plan', 1500),

-- Creative Rewards (2)
((SELECT id FROM reward_categories WHERE name = 'Creative'), 'Art Workshop Intensive', 'Attend a multi-day intensive art workshop with materials included', 1800),
((SELECT id FROM reward_categories WHERE name = 'Creative'), 'Music Production Studio Time', 'Book professional studio time to record or produce music', 1200),

-- Luxury Rewards (2)
((SELECT id FROM reward_categories WHERE name = 'Luxury'), 'Designer Item Purchase', 'Buy that designer item you''ve been eyeing (up to $500)', 2500),
((SELECT id FROM reward_categories WHERE name = 'Luxury'), 'Fine Dining Experience', 'Enjoy a multi-course tasting menu at a Michelin-starred restaurant', 1500);
