-- Manually award all eligible total habit trophies for users
-- This will award trophies that users have earned but haven't been marked as earned yet

-- Award total habit trophies for all users based on their habit completion counts
INSERT INTO user_total_habit_trophies (user_id, trophy_id, total_completions_at_time, earned_at)
SELECT 
    hc.user_id,
    tht.id as trophy_id,
    hc.completion_count as total_completions_at_time,
    NOW() as earned_at  -- Set current timestamp
FROM (
    -- Get each user's total habit completion count
    SELECT 
        user_id,
        COUNT(*) as completion_count
    FROM habit_completions
    GROUP BY user_id
) hc
JOIN total_habit_trophies tht ON hc.completion_count >= tht.total_completions_required
WHERE NOT EXISTS (
    -- Don't award if user already has this trophy
    SELECT 1 
    FROM user_total_habit_trophies utht 
    WHERE utht.user_id = hc.user_id 
    AND utht.trophy_id = tht.id
)
ORDER BY hc.user_id, tht.total_completions_required;

-- Show results
SELECT 
    'Total habit trophies awarded' as action,
    COUNT(*) as count
FROM user_total_habit_trophies utht
JOIN total_habit_trophies tht ON utht.trophy_id = tht.id
WHERE utht.earned_at >= NOW() - INTERVAL '1 minute';
