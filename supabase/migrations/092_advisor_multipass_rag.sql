-- Multi-pass RAG support: Enhanced tracking and metadata

-- Add query_refinement column to track how queries evolved across passes
ALTER TABLE advisor_rag_events
  ADD COLUMN IF NOT EXISTS query_refinement TEXT;

-- Ensure metadata column exists (should already be there from 091)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advisor_rag_events' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE advisor_rag_events ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Index for filtering multi-pass events
CREATE INDEX IF NOT EXISTS idx_advisor_rag_events_metadata_multipass 
  ON advisor_rag_events USING gin((metadata -> 'multi_pass')) 
  WHERE metadata -> 'multi_pass' = 'true'::jsonb;

-- Comment explaining metadata structure for multi-pass
COMMENT ON COLUMN advisor_rag_events.metadata IS 
'Multi-pass RAG events include: 
{
  "multi_pass": true,
  "total_passes": 2-3,
  "converged": true/false,
  "convergence_reason": "high_quality" | "no_new_chunks" | "max_passes",
  "total_unique_chunks": number,
  "pass_details": [
    {
      "passNum": 1,
      "query": "original or refined query",
      "newChunks": count,
      "strongMatches": count,
      "avgScore": 0.0-1.0,
      "durationMs": milliseconds
    }
  ]
}';

-- Admin analytics view: Multi-pass performance
CREATE OR REPLACE VIEW advisor_multipass_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) FILTER (WHERE metadata->>'multi_pass' = 'true') as multipass_count,
  COUNT(*) FILTER (WHERE metadata IS NULL OR metadata->>'multi_pass' != 'true') as singlepass_count,
  AVG(latency_ms) FILTER (WHERE metadata->>'multi_pass' = 'true') as avg_multipass_latency_ms,
  AVG(latency_ms) FILTER (WHERE metadata IS NULL OR metadata->>'multi_pass' != 'true') as avg_singlepass_latency_ms,
  AVG((metadata->>'total_passes')::int) FILTER (WHERE metadata->>'multi_pass' = 'true') as avg_passes_per_multipass,
  AVG(chunks_retrieved) FILTER (WHERE metadata->>'multi_pass' = 'true') as avg_multipass_chunks,
  AVG(chunks_retrieved) FILTER (WHERE metadata IS NULL OR metadata->>'multi_pass' != 'true') as avg_singlepass_chunks,
  COUNT(*) FILTER (WHERE metadata->>'converged' = 'true') as converged_count,
  COUNT(*) FILTER (WHERE metadata->>'convergence_reason' = 'high_quality') as high_quality_count,
  COUNT(*) FILTER (WHERE metadata->>'convergence_reason' = 'no_new_chunks') as no_new_chunks_count,
  COUNT(*) FILTER (WHERE metadata->>'convergence_reason' = 'max_passes') as max_passes_count
FROM advisor_rag_events
WHERE event_type = 'retrieve' AND status = 'success'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Grant select on view to authenticated users (read-only)
GRANT SELECT ON advisor_multipass_analytics TO authenticated;

-- Performance check query (for admin debugging)
COMMENT ON VIEW advisor_multipass_analytics IS 
'Analytics for multi-pass RAG performance.
Usage:
  SELECT * FROM advisor_multipass_analytics WHERE date > NOW() - INTERVAL ''7 days'';
  
Metrics:
- multipass_count: How many queries upgraded to multi-pass
- avg_multipass_latency_ms: Latency cost of multi-pass (expect 2-3x single-pass)
- avg_passes_per_multipass: Typically 2-3 passes before convergence
- converged_count: How many multi-pass queries converged vs hit max passes
- convergence_reason distribution shows quality signals';
