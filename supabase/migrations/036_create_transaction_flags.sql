-- Allow users to flag transactions for review (e.g. potential fraud, unclear charges)
CREATE TABLE IF NOT EXISTS transaction_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_flags_user_id ON transaction_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_flags_transaction_id ON transaction_flags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_flags_status ON transaction_flags(user_id, status);

ALTER TABLE transaction_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction flags"
    ON transaction_flags FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction flags"
    ON transaction_flags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction flags"
    ON transaction_flags FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction flags"
    ON transaction_flags FOR DELETE
    USING (auth.uid() = user_id);
