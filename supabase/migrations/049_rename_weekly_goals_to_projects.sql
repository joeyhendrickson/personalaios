-- Rename legacy `weekly_goals` (dashboard "Projects") to `projects`.
-- Preserves all rows, FKs (tasks.weekly_goal_id, points_ledger, priorities.project_id, etc.), and RLS policies.
-- Recreates SQL functions/views that still referenced `weekly_goals` by name in their bodies.

-- 1) Table rename
ALTER TABLE IF EXISTS public.weekly_goals RENAME TO projects;

-- 2) Trigger names (cosmetic). Fails gracefully only if triggers were already renamed / missing.
ALTER TRIGGER set_weekly_goals_user_id ON public.projects RENAME TO set_projects_user_id;
ALTER TRIGGER update_weekly_goals_updated_at ON public.projects RENAME TO update_projects_updated_at;
ALTER TRIGGER weekly_goals_audit_trigger ON public.projects RENAME TO projects_audit_trigger;

-- 3) Optional (cosmetic): rename indexes idx_weekly_goals_* → idx_projects_* in SQL Editor after this
-- migration, if desired. Omitted here so absence of migration 041 indexes does not break apply.

COMMENT ON COLUMN public.projects.project_sort_order IS 'Dashboard project list order; lower value appears first.';

-- 4) Task completion trigger: UPDATE must target `projects`
CREATE OR REPLACE FUNCTION public.update_goal_progress_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE public.projects
        SET
            current_points = current_points + NEW.points_value,
            current_money = current_money + NEW.money_value,
            updated_at = NOW()
        WHERE id = NEW.weekly_goal_id;

        NEW.completed_at = NOW();

        INSERT INTO public.points_ledger (user_id, task_id, weekly_goal_id, points, description)
        VALUES (NEW.user_id, NEW.id, NEW.weekly_goal_id, NEW.points_value, 'Task completed: ' || NEW.title);

        IF NEW.money_value > 0 THEN
            INSERT INTO public.money_ledger (user_id, task_id, weekly_goal_id, amount, description)
            VALUES (NEW.user_id, NEW.id, NEW.weekly_goal_id, NEW.money_value, 'Task completed: ' || NEW.title);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Progress snapshots
CREATE OR REPLACE FUNCTION public.create_progress_snapshot(p_user_id UUID, p_week_id UUID)
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
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE is_completed = true)
    INTO v_total_goals, v_completed_goals
    FROM public.projects
    WHERE user_id = p_user_id AND week_id = p_week_id;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_tasks, v_completed_tasks
    FROM tasks t
    JOIN public.projects wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    SELECT
        COALESCE(SUM(points_value), 0),
        COALESCE(SUM(points_value) FILTER (WHERE status = 'completed'), 0)
    INTO v_total_points, v_earned_points
    FROM tasks t
    JOIN public.projects wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    SELECT
        COALESCE(SUM(money_value), 0),
        COALESCE(SUM(money_value) FILTER (WHERE status = 'completed'), 0)
    INTO v_total_money, v_earned_money
    FROM tasks t
    JOIN public.projects wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id AND wg.week_id = p_week_id;

    IF v_total_points > 0 THEN
        v_progress_percentage := (v_earned_points::DECIMAL / v_total_points::DECIMAL) * 100;
    ELSE
        v_progress_percentage := 0;
    END IF;

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

-- 6) Weekly rollover
CREATE OR REPLACE FUNCTION public.rollover_week(p_user_id UUID, p_from_week_id UUID, p_to_week_id UUID)
RETURNS VOID AS $$
DECLARE
    v_incomplete_goals_count INTEGER;
    v_incomplete_tasks_count INTEGER;
    v_carried_over_points INTEGER;
    v_carried_over_money DECIMAL(10,2);
BEGIN
    SELECT COUNT(*)
    INTO v_incomplete_goals_count
    FROM public.projects
    WHERE user_id = p_user_id
    AND week_id = p_from_week_id
    AND is_completed = false;

    SELECT COUNT(*)
    INTO v_incomplete_tasks_count
    FROM tasks t
    JOIN public.projects wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id
    AND wg.week_id = p_from_week_id
    AND t.status != 'completed';

    SELECT
        COALESCE(SUM(points_value), 0),
        COALESCE(SUM(money_value), 0)
    INTO v_carried_over_points, v_carried_over_money
    FROM tasks t
    JOIN public.projects wg ON t.weekly_goal_id = wg.id
    WHERE wg.user_id = p_user_id
    AND wg.week_id = p_from_week_id
    AND t.status != 'completed';

    INSERT INTO public.projects (
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
    FROM public.projects
    WHERE user_id = p_user_id
    AND week_id = p_from_week_id
    AND is_completed = false;

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
    JOIN public.projects old_wg ON t.weekly_goal_id = old_wg.id
    JOIN public.projects new_wg ON new_wg.week_id = p_to_week_id
        AND new_wg.user_id = p_user_id
        AND new_wg.title = old_wg.title || ' (Carried Over)'
    WHERE old_wg.user_id = p_user_id
    AND old_wg.week_id = p_from_week_id
    AND t.status != 'completed';

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

-- 7) Stats helper (column names unchanged for callers)
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_goals INTEGER,
    completed_goals INTEGER,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    total_points INTEGER,
    weekly_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.projects WHERE user_id = user_uuid) as total_goals,
        (SELECT COUNT(*)::INTEGER FROM public.projects WHERE user_id = user_uuid AND is_completed = true) as completed_goals,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = user_uuid) as total_tasks,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = user_uuid AND status = 'completed') as completed_tasks,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = user_uuid) as total_points,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = user_uuid AND created_at >= date_trunc('week', NOW())) as weekly_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8) Dashboard view — project counts exposed as total_goals for backward compatibility
CREATE OR REPLACE VIEW public.user_dashboard_data AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(DISTINCT wg.id) as total_goals,
    COUNT(DISTINCT CASE WHEN wg.is_completed = true THEN wg.id END) as completed_goals,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT dh.id) as total_habits,
    COUNT(DISTINCT ei.id) as total_education_items,
    COALESCE(SUM(pl.points), 0) as total_points,
    COALESCE(SUM(CASE WHEN pl.created_at >= date_trunc('week', NOW()) THEN pl.points ELSE 0 END), 0) as weekly_points
FROM auth.users u
LEFT JOIN public.projects wg ON u.id = wg.user_id
LEFT JOIN tasks t ON u.id = t.user_id
LEFT JOIN daily_habits dh ON u.id = dh.user_id
LEFT JOIN education_items ei ON u.id = ei.user_id
LEFT JOIN points_ledger pl ON u.id = pl.user_id
GROUP BY u.id, u.email;

-- 9) Admin activity summary
CREATE OR REPLACE FUNCTION public.get_user_activity_summary()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    total_goals INTEGER,
    total_tasks INTEGER,
    total_points INTEGER,
    account_created TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id as user_id,
        u.email as user_email,
        GREATEST(
            COALESCE((SELECT MAX(updated_at) FROM public.projects WHERE user_id = u.id), u.created_at),
            COALESCE((SELECT MAX(updated_at) FROM tasks WHERE user_id = u.id), u.created_at),
            COALESCE((SELECT MAX(created_at) FROM points_ledger WHERE user_id = u.id), u.created_at)
        ) as last_active,
        (SELECT COUNT(*)::INTEGER FROM public.projects WHERE user_id = u.id) as total_goals,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = u.id) as total_tasks,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = u.id) as total_points,
        u.created_at as account_created
    FROM auth.users u
    ORDER BY last_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
