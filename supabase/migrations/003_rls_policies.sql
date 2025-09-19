-- Enable Row Level Security on all tables
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Weeks table policies
CREATE POLICY "Users can view their own weeks" ON weeks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weeks" ON weeks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weeks" ON weeks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weeks" ON weeks
    FOR DELETE USING (auth.uid() = user_id);

-- Weekly goals table policies
CREATE POLICY "Users can view their own goals" ON weekly_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON weekly_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON weekly_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON weekly_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Tasks table policies
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Points ledger table policies
CREATE POLICY "Users can view their own points ledger" ON points_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points ledger entries" ON points_ledger
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own points ledger entries" ON points_ledger
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own points ledger entries" ON points_ledger
    FOR DELETE USING (auth.uid() = user_id);

-- Money ledger table policies
CREATE POLICY "Users can view their own money ledger" ON money_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own money ledger entries" ON money_ledger
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own money ledger entries" ON money_ledger
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own money ledger entries" ON money_ledger
    FOR DELETE USING (auth.uid() = user_id);

-- Audit logs table policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert audit logs

-- Create function to automatically set user_id
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set user_id
CREATE TRIGGER set_weeks_user_id
    BEFORE INSERT ON weeks
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_weekly_goals_user_id
    BEFORE INSERT ON weekly_goals
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_tasks_user_id
    BEFORE INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_points_ledger_user_id
    BEFORE INSERT ON points_ledger
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_money_ledger_user_id
    BEFORE INSERT ON money_ledger
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_audit_logs_user_id
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
    p_table_name TEXT,
    p_operation TEXT,
    p_record_id UUID,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        record_id,
        old_data,
        new_data,
        metadata,
        user_id,
        created_at
    ) VALUES (
        p_table_name,
        p_operation,
        p_record_id,
        p_old_data,
        p_new_data,
        p_metadata,
        auth.uid(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
CREATE OR REPLACE FUNCTION create_audit_trigger(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TRIGGER %I_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION audit_trigger_function()',
        p_table_name, p_table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_operation TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        v_operation := 'INSERT';
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_operation := 'DELETE';
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    END IF;

    -- Log the audit event
    PERFORM log_audit_event(
        TG_TABLE_NAME,
        v_operation,
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data,
        jsonb_build_object(
            'trigger_operation', TG_OP,
            'trigger_name', TG_NAME,
            'trigger_when', TG_WHEN
        )
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
SELECT create_audit_trigger('weeks');
SELECT create_audit_trigger('weekly_goals');
SELECT create_audit_trigger('tasks');
SELECT create_audit_trigger('points_ledger');
SELECT create_audit_trigger('money_ledger');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weeks_user_id ON weeks(user_id);
CREATE INDEX IF NOT EXISTS idx_weeks_start_date ON weeks(start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON weekly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_id ON weekly_goals(week_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(weekly_goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_created_at ON points_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_money_ledger_user_id ON money_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_money_ledger_created_at ON money_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
