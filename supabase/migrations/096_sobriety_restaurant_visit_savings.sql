-- Restaurant visits that did not include drinking can count toward drink savings.

ALTER TABLE sobriety_profiles
  ADD COLUMN IF NOT EXISTS typical_drinks_per_outing NUMERIC(8, 2) NOT NULL DEFAULT 2;

ALTER TABLE sobriety_influence_places
  ADD COLUMN IF NOT EXISTS counts_as_sober_outing BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sobriety_influence_places_sober_outing
  ON sobriety_influence_places (user_id, counts_as_sober_outing)
  WHERE counts_as_sober_outing = true;
