-- Multiple scheduling windows for Lifestacks Calendar
ALTER TABLE calendar_preferences
ADD COLUMN IF NOT EXISTS time_windows JSONB DEFAULT NULL;

COMMENT ON COLUMN calendar_preferences.time_windows IS
  'Array of { id, start_hour, end_hour, days[] } scheduling windows for AI recommendations';
