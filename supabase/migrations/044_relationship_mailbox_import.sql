-- Mailbox (.mbox) import for Relationship Manager: contacts, threads, messages, embeddings, insights.
-- relationship_contacts links to existing relationships (one row per relationship for mailbox features).

CREATE TABLE IF NOT EXISTS public.relationship_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  relationship_id uuid NOT NULL REFERENCES public.relationships (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  primary_email text,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT relationship_contacts_relationship_unique UNIQUE (relationship_id)
);

CREATE INDEX IF NOT EXISTS idx_relationship_contacts_user_email
  ON public.relationship_contacts (user_id, lower(primary_email))
  WHERE primary_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.relationship_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.relationship_contacts (id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'email_mbox',
  original_file_name text,
  file_path text,
  status text NOT NULL DEFAULT 'pending',
  total_messages integer NOT NULL DEFAULT 0,
  imported_messages integer NOT NULL DEFAULT 0,
  skipped_messages integer NOT NULL DEFAULT 0,
  duplicate_messages integer NOT NULL DEFAULT 0,
  total_threads integer NOT NULL DEFAULT 0,
  incoming_count integer NOT NULL DEFAULT 0,
  outgoing_count integer NOT NULL DEFAULT 0,
  date_range_start timestamptz,
  date_range_end timestamptz,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_relationship_import_jobs_user_created
  ON public.relationship_import_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relationship_import_jobs_user_contact_status
  ON public.relationship_import_jobs (user_id, contact_id, status);

CREATE TABLE IF NOT EXISTS public.relationship_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.relationship_contacts (id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'email',
  external_thread_key text,
  subject text,
  first_message_at timestamptz,
  last_message_at timestamptz,
  message_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_threads_user_contact_last
  ON public.relationship_threads (user_id, contact_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.relationship_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.relationship_contacts (id) ON DELETE SET NULL,
  thread_id uuid REFERENCES public.relationship_threads (id) ON DELETE SET NULL,
  import_job_id uuid REFERENCES public.relationship_import_jobs (id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'email',
  external_message_id text,
  timestamp timestamptz,
  direction text,
  from_email text,
  from_name text,
  to_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject text,
  cleaned_body text,
  raw_body text,
  body_hash text,
  has_attachments boolean NOT NULL DEFAULT false,
  attachment_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_messages_user_contact_ts
  ON public.relationship_messages (user_id, contact_id, timestamp DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_relationship_messages_user_thread_ts
  ON public.relationship_messages (user_id, thread_id, timestamp ASC NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_relationship_messages_user_body_hash
  ON public.relationship_messages (user_id, body_hash)
  WHERE body_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.relationship_message_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.relationship_contacts (id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.relationship_messages (id) ON DELETE CASCADE,
  embedding_model text NOT NULL,
  content_hash text NOT NULL,
  embedding vector(1536),
  token_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_message_embeddings_user_contact
  ON public.relationship_message_embeddings (user_id, contact_id);

CREATE TABLE IF NOT EXISTS public.relationship_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.relationship_contacts (id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  summary text,
  structured_insight jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_import_job_id uuid REFERENCES public.relationship_import_jobs (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_insights_user_contact_created
  ON public.relationship_insights (user_id, contact_id, created_at DESC);

-- RLS
ALTER TABLE public.relationship_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY relationship_contacts_own ON public.relationship_contacts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY relationship_import_jobs_own ON public.relationship_import_jobs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY relationship_threads_own ON public.relationship_threads
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY relationship_messages_own ON public.relationship_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY relationship_message_embeddings_own ON public.relationship_message_embeddings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY relationship_insights_own ON public.relationship_insights
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER relationship_contacts_set_updated_at
  BEFORE UPDATE ON public.relationship_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
