-- Update discipline trophies to be more attainable
-- New requirements: 1, 3, 5, 7, 10, 15, 21, 30 completions (instead of 5, 10, 20, 30, 40, 50, 75, 100)

-- First, update the existing trophies with new requirements
UPDATE discipline_trophies
SET habit_count_required = 1,
    name = 'The Young Squire',
    essence_description = 'The first step on the path. You have awakened to the call of discipline.',
    reflection_message = 'Every master was once a beginner. Your journey begins with this single step.'
WHERE habit_count_required = 5;

UPDATE discipline_trophies
SET habit_count_required = 3,
    name = 'The Seeker',
    essence_description = 'Consistency begins to form. Three steps forward on the path.',
    reflection_message = 'The seed of discipline has been planted. Water it daily.'
WHERE habit_count_required = 10;

UPDATE discipline_trophies
SET habit_count_required = 5,
    name = 'The Practitioner',
    essence_description = 'The path becomes familiar. Your practice takes root.',
    reflection_message = 'Five days of commitment. You are building something real.'
WHERE habit_count_required = 20;

UPDATE discipline_trophies
SET habit_count_required = 7,
    name = 'The Dedicated One',
    essence_description = 'A full week of devotion. The habit loop strengthens.',
    reflection_message = 'Seven days. A complete cycle. Your dedication is becoming visible.'
WHERE habit_count_required = 30;

UPDATE discipline_trophies
SET habit_count_required = 10,
    name = 'The Unwavering',
    essence_description = 'Ten days of persistence. Doubt begins to fade.',
    reflection_message = 'Double digits. The path is yours now, and you walk it with confidence.'
WHERE habit_count_required = 40;

UPDATE discipline_trophies
SET habit_count_required = 15,
    name = 'The Steadfast',
    essence_description = 'Two weeks of unbroken commitment. Discipline becomes second nature.',
    reflection_message = 'Fifteen days. Halfway to a month. You are transforming.'
WHERE habit_count_required = 50;

UPDATE discipline_trophies
SET habit_count_required = 21,
    name = 'The Transformed',
    essence_description = 'Three weeks. The habit is now part of who you are.',
    reflection_message = 'Twenty-one days. Science says you\'ve formed a habit. Spirit says you\'ve found yourself.'
WHERE habit_count_required = 75;

UPDATE discipline_trophies
SET habit_count_required = 30,
    name = 'The Enlightened',
    essence_description = 'A full month of mastery. You have transcended the need for motivation.',
    reflection_message = 'Thirty days of unbroken practice. You are no longer becoming disciplined—you ARE disciplined.'
WHERE habit_count_required = 100;

-- Verify the changes
SELECT name, habit_count_required, essence_description 
FROM discipline_trophies 
ORDER BY habit_count_required;

