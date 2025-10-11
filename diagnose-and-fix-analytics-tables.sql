-- DIAGNOSE AND FIX: Check and create missing analytics tables if needed

-- Create user_analytics_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_analytics_summary (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_visits INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    total_tasks_created INTEGER DEFAULT 0,
    total_goals_created INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_goals_completed INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.user_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user_analytics_summary
DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics_summary;
CREATE POLICY "Users can view own analytics" ON public.user_analytics_summary
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert analytics" ON public.user_analytics_summary;
CREATE POLICY "System can insert analytics" ON public.user_analytics_summary
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update analytics" ON public.user_analytics_summary;
CREATE POLICY "System can update analytics" ON public.user_analytics_summary
    FOR UPDATE USING (true);

-- Create policies for user_activity_logs
DROP POLICY IF EXISTS "Users can view own logs" ON public.user_activity_logs;
CREATE POLICY "Users can view own logs" ON public.user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert logs" ON public.user_activity_logs;
CREATE POLICY "System can insert logs" ON public.user_activity_logs
    FOR INSERT WITH CHECK (true);

-- Now recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION create_user_analytics_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial analytics record for new user
    BEGIN
        INSERT INTO user_analytics_summary (user_id, first_visit)
        VALUES (NEW.id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create user analytics: %', SQLERRM;
    END;
    
    -- Log the signup activity
    BEGIN
        INSERT INTO user_activity_logs (user_id, activity_type, activity_data)
        VALUES (NEW.id, 'login', jsonb_build_object('signup', true, 'email', NEW.email));
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to log signup activity: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;
CREATE TRIGGER trigger_create_user_analytics
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_analytics_on_signup();

-- Test that everything is working
SELECT 'Analytics tables created and trigger configured successfully!' as status;

