-- Update reward points by multiplying by 10 (adding a zero)
-- This will make rewards more meaningful and require more points to earn

UPDATE rewards SET point_cost = point_cost * 10;

-- Verify the changes
SELECT name, point_cost 
FROM rewards 
ORDER BY point_cost;
