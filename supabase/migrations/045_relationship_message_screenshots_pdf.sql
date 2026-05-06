-- Add basic file metadata so message "screenshots" can include PDFs.
ALTER TABLE relationship_message_screenshots
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT;

