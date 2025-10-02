-- Create trading analyses table for saving/loading stock analysis configurations
CREATE TABLE IF NOT EXISTS trading_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  stock_symbol VARCHAR(10) NOT NULL,
  buying_power DECIMAL(15,2) NOT NULL,
  investor_type VARCHAR(50) NOT NULL,
  information_sources JSONB DEFAULT '[]'::jsonb,
  event_monitoring JSONB DEFAULT '{}'::jsonb,
  manual_stock_data JSONB DEFAULT '{}'::jsonb,
  analysis_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trading_analyses_user_id ON trading_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_analyses_stock_symbol ON trading_analyses(stock_symbol);
CREATE INDEX IF NOT EXISTS idx_trading_analyses_created_at ON trading_analyses(created_at DESC);

-- Enable RLS
ALTER TABLE trading_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own trading analyses" ON trading_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading analyses" ON trading_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading analyses" ON trading_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading analyses" ON trading_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trading_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trading_analyses_updated_at
  BEFORE UPDATE ON trading_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_trading_analyses_updated_at();
