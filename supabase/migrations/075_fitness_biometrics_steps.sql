-- Steps from Google Health sync (may be missing if 060 was only partially applied).
ALTER TABLE fitness_biometrics
  ADD COLUMN IF NOT EXISTS steps INT;
