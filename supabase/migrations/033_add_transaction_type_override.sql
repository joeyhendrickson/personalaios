-- Allow users to override how a transaction is displayed (income vs expense)
-- when the default logic (based on account type and amount sign) is wrong
CREATE TABLE IF NOT EXISTS transaction_type_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    type_override TEXT NOT NULL CHECK (type_override IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_type_overrides_user_id ON transaction_type_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_type_overrides_transaction_id ON transaction_type_overrides(transaction_id);

ALTER TABLE transaction_type_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction type overrides"
    ON transaction_type_overrides FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction type overrides"
    ON transaction_type_overrides FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction type overrides"
    ON transaction_type_overrides FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction type overrides"
    ON transaction_type_overrides FOR DELETE
    USING (auth.uid() = user_id);
