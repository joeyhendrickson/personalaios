-- AI usage transparency: token counts, estimated cost, observability metadata.
-- Inserts are intended to run server-side with the service role only.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  module text NOT NULL,
  action text NOT NULL,
  route text,
  model text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric,
  actual_cost_usd numeric,
  description text,
  status text NOT NULL DEFAULT 'completed',
  latency_ms integer,
  request_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_module_created_idx
  ON public.ai_usage_logs (module, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_action_created_idx
  ON public.ai_usage_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_model_created_idx
  ON public.ai_usage_logs (model, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_status_created_idx
  ON public.ai_usage_logs (status, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users may read only their own rows.
CREATE POLICY ai_usage_logs_select_own
  ON public.ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated: logging uses service role.

COMMENT ON TABLE public.ai_usage_logs IS 'Server-side AI usage and cost estimates; no prompt/completion content.';
