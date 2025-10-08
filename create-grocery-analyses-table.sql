-- Create grocery_analyses table to store receipt analysis history
CREATE TABLE IF NOT EXISTS grocery_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  total_spending DECIMAL(10, 2) NOT NULL,
  total_savings DECIMAL(10, 2) NOT NULL,
  recommended_store TEXT,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_grocery_analyses_user_id ON grocery_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_analyses_created_at ON grocery_analyses(created_at);

-- Enable RLS
ALTER TABLE grocery_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analyses"
  ON grocery_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON grocery_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON grocery_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON grocery_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_grocery_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grocery_analyses_updated_at
  BEFORE UPDATE ON grocery_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_grocery_analyses_updated_at();

