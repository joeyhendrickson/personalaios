import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedMailboxMessage } from './parse-mbox-chunk'

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Factual, non-sensitive aggregates only (no bodies, no names in structured JSON). */
export function buildMailboxImportStructuredInsight(params: {
  imported: number
  threads: number
  incoming: number
  outgoing: number
  duplicates: number
  skipped: number
  dateStart: string | null
  dateEnd: string | null
  messages: ParsedMailboxMessage[]
}): { summary: string; structured: Record<string, unknown> } {
  const byMonth: Record<string, number> = {}
  const subjectCounts: Record<string, number> = {}

  for (const m of params.messages) {
    if (m.date) {
      const k = monthKey(m.date)
      byMonth[k] = (byMonth[k] || 0) + 1
    }
    const subj = (m.subject || '').trim().slice(0, 120) || '(no subject)'
    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1
  }

  const topSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, count]) => ({ label, count }))

  const ratioIn =
    params.incoming + params.outgoing > 0
      ? Math.round((params.incoming / (params.incoming + params.outgoing)) * 1000) / 1000
      : null

  const structured: Record<string, unknown> = {
    total_messages: params.imported,
    total_threads: params.threads,
    first_interaction_at: params.dateStart,
    latest_interaction_at: params.dateEnd,
    incoming_count: params.incoming,
    outgoing_count: params.outgoing,
    incoming_ratio: ratioIn,
    duplicates_skipped: params.duplicates,
    malformed_skipped: params.skipped,
    messages_by_month: byMonth,
    common_subject_lines: topSubjects,
  }

  const summary = [
    `Imported ${params.imported} messages across ${params.threads} threads.`,
    params.dateStart && params.dateEnd
      ? `Date range ${params.dateStart.slice(0, 10)} → ${params.dateEnd.slice(0, 10)}.`
      : '',
    `Incoming ${params.incoming}, outgoing ${params.outgoing}.`,
    params.duplicates ? `Duplicates skipped: ${params.duplicates}.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return { summary, structured }
}

export async function insertMailboxImportInsight(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  jobId: string,
  payload: { summary: string; structured: Record<string, unknown> }
) {
  await supabase.from('relationship_insights').insert({
    user_id: userId,
    contact_id: contactId,
    insight_type: 'mailbox_import_summary',
    summary: payload.summary,
    structured_insight: payload.structured,
    source_import_job_id: jobId,
  })
}
