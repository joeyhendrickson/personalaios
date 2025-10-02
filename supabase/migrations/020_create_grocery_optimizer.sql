-- Create grocery store optimizer system tables
-- This migration creates tables for grocery receipt analysis and store optimization

-- Grocery receipts table
CREATE TABLE IF NOT EXISTS grocery_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    store_location TEXT,
    zipcode TEXT NOT NULL,
    receipt_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    receipt_image_url TEXT,
    receipt_text TEXT, -- OCR extracted text
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual items from receipts
CREATE TABLE IF NOT EXISTS grocery_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES grocery_receipts(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_category TEXT, -- e.g., 'produce', 'dairy', 'meat', 'pantry'
    brand TEXT,
    quantity DECIMAL(8,2),
    unit TEXT, -- e.g., 'lbs', 'oz', 'each', 'gallon'
    unit_price DECIMAL(8,2),
    total_price DECIMAL(8,2) NOT NULL,
    is_organic BOOLEAN DEFAULT FALSE,
    is_generic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store information and pricing data
CREATE TABLE IF NOT EXISTS grocery_stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT NOT NULL,
    store_chain TEXT, -- e.g., 'Walmart', 'Target', 'Kroger'
    address TEXT,
    city TEXT,
    state TEXT,
    zipcode TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    phone TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store pricing data for items
CREATE TABLE IF NOT EXISTS store_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES grocery_stores(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_category TEXT,
    brand TEXT,
    unit_price DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    is_organic BOOLEAN DEFAULT FALSE,
    is_generic BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_source TEXT DEFAULT 'user_reported', -- 'user_reported', 'api', 'estimated'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI analysis results for receipts
CREATE TABLE IF NOT EXISTS receipt_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES grocery_receipts(id) ON DELETE CASCADE,
    total_savings_potential DECIMAL(10,2),
    alternative_store_recommendations JSONB, -- Array of store recommendations
    item_alternatives JSONB, -- Alternative items with better prices
    analysis_summary TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences for grocery shopping
CREATE TABLE IF NOT EXISTS grocery_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_stores TEXT[], -- Array of preferred store names
    max_drive_distance INTEGER DEFAULT 20, -- Maximum miles willing to drive
    prioritize_organic BOOLEAN DEFAULT FALSE,
    prioritize_generic BOOLEAN DEFAULT FALSE,
    budget_limit DECIMAL(10,2),
    dietary_restrictions TEXT[], -- e.g., 'gluten_free', 'vegan', 'keto'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE grocery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grocery_receipts
CREATE POLICY "Users can view their own grocery receipts" ON grocery_receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grocery receipts" ON grocery_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grocery receipts" ON grocery_receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grocery receipts" ON grocery_receipts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for grocery_items
CREATE POLICY "Users can view items from their receipts" ON grocery_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = grocery_items.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to their receipts" ON grocery_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = grocery_items.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items from their receipts" ON grocery_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = grocery_items.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their receipts" ON grocery_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = grocery_items.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

-- Create RLS policies for grocery_stores (public read access)
CREATE POLICY "Anyone can view grocery stores" ON grocery_stores
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert stores" ON grocery_stores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for store_prices (public read access)
CREATE POLICY "Anyone can view store prices" ON store_prices
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert prices" ON store_prices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for receipt_analysis
CREATE POLICY "Users can view analysis of their receipts" ON receipt_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = receipt_analysis.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analysis for their receipts" ON receipt_analysis
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM grocery_receipts 
      WHERE grocery_receipts.id = receipt_analysis.receipt_id 
      AND grocery_receipts.user_id = auth.uid()
    )
  );

-- Create RLS policies for grocery_preferences
CREATE POLICY "Users can view their own grocery preferences" ON grocery_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grocery preferences" ON grocery_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grocery preferences" ON grocery_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grocery preferences" ON grocery_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grocery_receipts_user_id ON grocery_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_receipts_zipcode ON grocery_receipts(zipcode);
CREATE INDEX IF NOT EXISTS idx_grocery_receipts_date ON grocery_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_grocery_items_receipt_id ON grocery_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items(item_category);
CREATE INDEX IF NOT EXISTS idx_grocery_stores_zipcode ON grocery_stores(zipcode);
CREATE INDEX IF NOT EXISTS idx_grocery_stores_chain ON grocery_stores(store_chain);
CREATE INDEX IF NOT EXISTS idx_store_prices_store_id ON store_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_store_prices_item_name ON store_prices(item_name);
CREATE INDEX IF NOT EXISTS idx_receipt_analysis_receipt_id ON receipt_analysis(receipt_id);
CREATE INDEX IF NOT EXISTS idx_grocery_preferences_user_id ON grocery_preferences(user_id);

-- Insert some default grocery stores (major chains)
INSERT INTO grocery_stores (store_name, store_chain, zipcode, is_active) VALUES
('Walmart Supercenter', 'Walmart', '90210', true),
('Target', 'Target', '90210', true),
('Kroger', 'Kroger', '90210', true),
('Safeway', 'Safeway', '90210', true),
('Whole Foods Market', 'Whole Foods', '90210', true),
('Trader Joe''s', 'Trader Joe''s', '90210', true),
('Costco', 'Costco', '90210', true),
('Sam''s Club', 'Sam''s Club', '90210', true)
ON CONFLICT DO NOTHING;
