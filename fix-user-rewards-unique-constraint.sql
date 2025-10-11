-- Fix user_rewards unique constraint to allow multiple entries of the same reward
-- This allows users to redeem the same reward multiple times

-- Drop the existing unique constraint
ALTER TABLE user_rewards DROP CONSTRAINT IF EXISTS user_rewards_user_id_reward_id_key;

-- Create a new unique constraint that only prevents duplicates when both user_id, reward_id, AND is_redeemed are the same
-- This allows the same user to have the same reward multiple times as long as they're not all in the same state
CREATE UNIQUE INDEX user_rewards_user_reward_redeemed_unique 
ON user_rewards (user_id, reward_id, is_redeemed) 
WHERE is_redeemed = false;

-- This constraint ensures a user can only have one unredeemed version of each reward
-- But they can have multiple redeemed versions (for tracking redemption history)
