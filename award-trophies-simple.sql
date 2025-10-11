-- Simple script to award all eligible total habit trophies

INSERT INTO user_total_habit_trophies (user_id, trophy_id, total_completions_at_time, earned_at)
SELECT 
    hc.user_id,
    tht.id as trophy_id,
    hc.completion_count as total_completions_at_time,
    NOW() as earned_at
FROM (
    SELECT 
        user_id,
        COUNT(*) as completion_count
    FROM habit_completions
    GROUP BY user_id
) hc
JOIN total_habit_trophies tht ON hc.completion_count >= tht.total_completions_required
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_total_habit_trophies utht 
    WHERE utht.user_id = hc.user_id 
    AND utht.trophy_id = tht.id
);
