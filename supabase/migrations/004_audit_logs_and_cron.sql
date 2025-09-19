-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create progress snapshots table
CREATE TABLE IF NOT EXISTS progress_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_goals INTEGER NOT NULL DEFAULT 0,
    completed_goals INTEGER NOT NULL DEFAULT 0,
    total_tasks INTEGER NOT NULL DEFAULT 0,
    completed_tasks INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    earned_points INTEGER NOT NULL DEFAULT 0,
    total_money DECIMAL(10,2) NOT NULL DEFAULT 0,
    earned_money DECIMAL(10,2) NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_id, snapshot_date)
);

-- Create weekly rollover log table
CREATE TABLE IF NOT EXISTS weekly_rollover_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    from_week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
    to_week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
    rollover_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    incomplete_goals_count INTEGER NOT NULL DEFAULT 0,
    incomplete_tasks_count INTEGER NOT NULL DEFAULT 0,
    carried_over_points INTEGER NOT NULL DEFAULT 0,
    carried_over_money DECIMAL(10,2) NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rollover_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for progress snapshots
CREATE POLICY "Users can view their own progress snapshots" ON progress_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert progress snapshots" ON progress_snapshots
    FOR INSERT WITH CHECK (true);

-- RLS policies for weekly rollover logs
CREATE POLICY "Users can view their own rollover logs" ON weekly_rollover_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert rollover logs" ON weekly_rollover_logs
    FOR INSERT WITH CHECK (true);

-- Function to create progress snapshot
CREATE OR REPLACE FUNCTION create_progress_snapshot(p_user_id UUID, p_week_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_goals INTEGER;
    v_completed_goals INTEGER;
    v_total_tasks INTEGER;
    v_completed_tasks INTEGER;
    v_total_points INTEGER;
    v_earned_points INTEGER;
    v_total_money DECIMAL(10,2);
    v_earned_money DECIMAL(10,2);
    v_progress_percentage DECIMAL(5,2);
BEGIN
    -- Get goal statistics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_completed = true)
    INTO v_total_goals, v_completed_goals
    FROM weekly_goals 
    WHERE user_id = p_user_id AND week_id = p_week_id;

    -- Get task statistics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_tasks, v_completed_tasks
    FROM tasks t
    JOIN weekly_goals wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    -- Get points statistics
    SELECT 
        COALESCE(SUM(points_value), 0),
        COALESCE(SUM(points_value) FILTER (WHERE status = 'completed'), 0)
    INTO v_total_points, v_earned_points
    FROM tasks t
    JOIN weekly_goals wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    -- Get money statistics
    SELECT 
        COALESCE(SUM(money_value), 0),
        COALESCE(SUM(money_value) FILTER (WHERE status = 'completed'), 0)
    INTO v_total_money, v_earned_money
    FROM tasks t
    JOIN weekly_goals wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    -- Calculate progress percentage
    IF v_total_points > 0 THEN
        v_progress_percentage := (v_earned_points::DECIMAL / v_total_points::DECIMAL) * 100;
    ELSE
        v_progress_percentage := 0;
    END IF;

    -- Insert progress snapshot
    INSERT INTO progress_snapshots (
        user_id,
        week_id,
        snapshot_date,
        total_goals,
        completed_goals,
        total_tasks,
        completed_tasks,
        total_points,
        earned_points,
        total_money,
        earned_money,
        progress_percentage
    ) VALUES (
        p_user_id,
        p_week_id,
        CURRENT_DATE,
        v_total_goals,
        v_completed_goals,
        v_total_tasks,
        v_completed_tasks,
        v_total_points,
        v_earned_points,
        v_total_money,
        v_earned_money,
        v_progress_percentage
    ) ON CONFLICT (user_id, week_id, snapshot_date) 
    DO UPDATE SET
        total_goals = EXCLUDED.total_goals,
        completed_goals = EXCLUDED.completed_goals,
        total_tasks = EXCLUDED.total_tasks,
        completed_tasks = EXCLUDED.completed_tasks,
        total_points = EXCLUDED.total_points,
        earned_points = EXCLUDED.earned_points,
        total_money = EXCLUDED.total_money,
        earned_money = EXCLUDED.earned_money,
        progress_percentage = EXCLUDED.progress_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollover incomplete items to next week
CREATE OR REPLACE FUNCTION rollover_week(p_user_id UUID, p_from_week_id UUID, p_to_week_id UUID)
RETURNS VOID AS $$
DECLARE
    v_incomplete_goals_count INTEGER;
    v_incomplete_tasks_count INTEGER;
    v_carried_over_points INTEGER;
    v_carried_over_money DECIMAL(10,2);
BEGIN
    -- Count incomplete goals
    SELECT COUNT(*)
    INTO v_incomplete_goals_count
    FROM weekly_goals 
    WHERE user_id = p_user_id 
    AND week_id = p_from_week_id 
    AND is_completed = false;

    -- Count incomplete tasks
    SELECT COUNT(*)
    INTO v_incomplete_tasks_count
    FROM tasks t
    JOIN weekly_goals wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id 
    AND wg.week_id = p_from_week_id 
    AND t.status != 'completed';

    -- Calculate carried over points and money
    SELECT 
        COALESCE(SUM(points_value), 0),
        COALESCE(SUM(money_value), 0)
    INTO v_carried_over_points, v_carried_over_money
    FROM tasks t
    JOIN weekly_goals wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id 
    AND wg.week_id = p_from_week_id 
    AND t.status != 'completed';

    -- Create new goals for incomplete goals
    INSERT INTO weekly_goals (
        user_id,
        week_id,
        title,
        description,
        category,
        target_points,
        target_money,
        is_completed,
        created_at
    )
    SELECT 
        p_user_id,
        p_to_week_id,
        title || ' (Carried Over)',
        description,
        category,
        target_points,
        target_money,
        false,
        NOW()
    FROM weekly_goals 
    WHERE user_id = p_user_id 
    AND week_id = p_from_week_id 
    AND is_completed = false;

    -- Create new tasks for incomplete tasks
    INSERT INTO tasks (
        user_id,
        weekly_goal_id,
        title,
        description,
        points_value,
        money_value,
        status,
        created_at
    )
    SELECT 
        p_user_id,
        new_wg.id,
        t.title,
        t.description,
        t.points_value,
        t.money_value,
        'pending',
        NOW()
    FROM tasks t
    JOIN weekly_goals old_wg ON t.weekly_goal_id = old_wg.id
    JOIN weekly_goals new_wg ON new_wg.week_id = p_to_week_id 
        AND new_wg.user_id = p_user_id
        AND new_wg.title = old_wg.title || ' (Carried Over)'
    WHERE old_wg.user_id = p_user_id 
    AND old_wg.week_id = p_from_week_id 
    AND t.status != 'completed';

    -- Log the rollover
    INSERT INTO weekly_rollover_logs (
        user_id,
        from_week_id,
        to_week_id,
        incomplete_goals_count,
        incomplete_tasks_count,
        carried_over_points,
        carried_over_money,
        metadata
    ) VALUES (
        p_user_id,
        p_from_week_id,
        p_to_week_id,
        v_incomplete_goals_count,
        v_incomplete_tasks_count,
        v_carried_over_points,
        v_carried_over_money,
        jsonb_build_object(
            'rollover_type', 'automatic',
            'rollover_date', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run nightly maintenance
CREATE OR REPLACE FUNCTION run_nightly_maintenance()
RETURNS VOID AS $$
DECLARE
    v_user_record RECORD;
    v_current_week_id UUID;
    v_next_week_id UUID;
    v_week_start DATE;
    v_week_end DATE;
BEGIN
    -- Get all users
    FOR v_user_record IN SELECT id FROM auth.users LOOP
        -- Find current week for user
        SELECT id INTO v_current_week_id
        FROM weeks 
        WHERE user_id = v_user_record.id 
        AND start_date <= CURRENT_DATE 
        AND end_date >= CURRENT_DATE
        LIMIT 1;

        -- Create progress snapshot for current week
        IF v_current_week_id IS NOT NULL THEN
            PERFORM create_progress_snapshot(v_user_record.id, v_current_week_id);
        END IF;

        -- Check if we need to create next week
        v_week_start := date_trunc('week', CURRENT_DATE + INTERVAL '1 week')::DATE;
        v_week_end := v_week_start + INTERVAL '6 days';

        -- Check if next week already exists
        SELECT id INTO v_next_week_id
        FROM weeks 
        WHERE user_id = v_user_record.id 
        AND start_date = v_week_start
        LIMIT 1;

        -- Create next week if it doesn't exist
        IF v_next_week_id IS NULL THEN
            INSERT INTO weeks (user_id, start_date, end_date)
            VALUES (v_user_record.id, v_week_start, v_week_end)
            RETURNING id INTO v_next_week_id;
        END IF;

        -- Rollover incomplete items if it's Sunday (end of week)
        IF EXTRACT(DOW FROM CURRENT_DATE) = 0 AND v_current_week_id IS NOT NULL THEN
            PERFORM rollover_week(v_user_record.id, v_current_week_id, v_next_week_id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user_id ON progress_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_week_id ON progress_snapshots(week_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_snapshot_date ON progress_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_weekly_rollover_logs_user_id ON weekly_rollover_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_rollover_logs_rollover_date ON weekly_rollover_logs(rollover_date);
