-- Production databases created before name was added still lack this column.
-- PostgREST then rejects inserts that include name ("schema cache").
ALTER TABLE budget_analyses ADD COLUMN IF NOT EXISTS name TEXT;
