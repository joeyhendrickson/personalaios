-- Progress reports: AI-generated weekly / bi-monthly / monthly summaries with PDF export

CREATE TABLE IF NOT EXISTS public.progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'bi_monthly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_base64 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_reports_user_created
  ON public.progress_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_reports_user_week
  ON public.progress_reports (user_id, created_at);

ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY progress_reports_select_own
  ON public.progress_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY progress_reports_insert_own
  ON public.progress_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.progress_reports IS 'User progress reports (weekly/bi-monthly/monthly) with AI narrative and DALL-E cover art';
