-- Body Analysis: store the optional height/weight captured at photo upload time.
-- The fitness tracker collects these alongside the photo; persist them so AI
-- analysis and progress tracking can use them.

ALTER TABLE body_photos
  ADD COLUMN IF NOT EXISTS height_inches NUMERIC(5, 2);

ALTER TABLE body_photos
  ADD COLUMN IF NOT EXISTS weight_lbs NUMERIC(6, 2);
