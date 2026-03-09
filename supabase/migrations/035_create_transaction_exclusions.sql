-- Allow users to exclude duplicate or unwanted transactions from the list
CREATE TABLE IF NOT EXISTS transaction_exclusions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_exclusions_user_id ON transaction_exclusions(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_exclusions_transaction_id ON transaction_exclusions(transaction_id);

ALTER TABLE transaction_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction exclusions"
    ON transaction_exclusions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction exclusions"
    ON transaction_exclusions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction exclusions"
    ON transaction_exclusions FOR DELETE
    USING (auth.uid() = user_id);
