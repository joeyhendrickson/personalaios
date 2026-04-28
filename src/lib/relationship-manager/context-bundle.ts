import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type RelationshipContextBundle = {
  profileText: string
  photoContext: string
  documentContext: string
  screenshotContext: string
  notesContext: string
  contactContext: string
}

export async function buildRelationshipContextBundle(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string
): Promise<RelationshipContextBundle> {
  const { data: rel } = await supabase
    .from('relationships')
    .select(
      'name, relationship_type, notes, priority_level, last_contact_date, contact_frequency_days, zip_code, profession, years_known, interests, vision, habits'
    )
    .eq('id', relationshipId)
    .eq('user_id', userId)
    .maybeSingle()

  const profileText = rel
    ? [
        `Name: ${rel.name}`,
        `Type: ${rel.relationship_type}`,
        `Priority: ${rel.priority_level}/5`,
        rel.zip_code ? `Zip / locale: ${rel.zip_code}` : null,
        rel.profession ? `Profession: ${rel.profession}` : null,
        rel.years_known != null ? `Years known: ${rel.years_known}` : null,
        rel.interests ? `Interests: ${rel.interests}` : null,
        rel.vision ? `Their vision / goals: ${rel.vision}` : null,
        rel.habits ? `Habits / style: ${rel.habits}` : null,
        rel.notes ? `General notes: ${rel.notes}` : null,
        `Contact cadence: every ${rel.contact_frequency_days} days`,
        rel.last_contact_date ? `Last contact recorded: ${rel.last_contact_date}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const { data: photos } = await supabase
    .from('relationship_photos')
    .select('description, ai_tags, photo_date, location, user_caption, source')
    .eq('relationship_id', relationshipId)
    .eq('user_id', userId)
    .order('photo_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8)

  const photoContext =
    photos && photos.length > 0
      ? photos
          .map((p) => {
            const tags = (p.ai_tags as string[] | null)?.join(', ') || ''
            const cap = p.user_caption ? `Caption: ${p.user_caption}. ` : ''
            return `${cap}${p.description || 'Photo'} (${p.source})${p.photo_date ? ` @ ${p.photo_date}` : ''}${p.location ? ` @ ${p.location}` : ''}. Tags: ${tags}`
          })
          .join('\n')
      : 'No indexed photos yet.'

  const { data: docs } = await supabase
    .from('relationship_documents')
    .select('file_name, kind, extracted_summary')
    .eq('relationship_id', relationshipId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12)

  const documentContext =
    docs && docs.length > 0
      ? docs
          .map((d) => {
            const sum = d.extracted_summary
              ? `\nSummary: ${d.extracted_summary.slice(0, 2000)}`
              : ''
            return `- [${d.kind}] ${d.file_name}${sum}`
          })
          .join('\n')
      : 'No uploaded documents yet.'

  const { data: shots } = await supabase
    .from('relationship_message_screenshots')
    .select('caption_notes, ai_thread_summary, created_at')
    .eq('relationship_id', relationshipId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  const screenshotContext =
    shots && shots.length > 0
      ? shots
          .map((s) => {
            const hint = s.caption_notes ? `User note: ${s.caption_notes}\n` : ''
            const ai = s.ai_thread_summary || '(no AI summary yet)'
            return `${hint}${ai}`
          })
          .join('\n---\n')
      : 'No message screenshots summarized yet.'

  const { data: rnotes } = await supabase
    .from('relationship_notes')
    .select('body, created_at')
    .eq('relationship_id', relationshipId)
    .order('created_at', { ascending: false })
    .limit(15)

  const notesContext =
    rnotes && rnotes.length > 0
      ? rnotes.map((n) => `- (${n.created_at}) ${n.body}`).join('\n')
      : 'No timeline notes.'

  const { data: history } = await supabase
    .from('contact_history')
    .select('contact_type, outcome, created_at')
    .eq('relationship_id', relationshipId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6)

  const contactContext =
    history && history.length > 0
      ? history.map((c) => `${c.contact_type} on ${c.created_at}: ${c.outcome || '—'}`).join('\n')
      : 'No logged interactions.'

  return {
    profileText,
    photoContext,
    documentContext,
    screenshotContext,
    notesContext,
    contactContext,
  }
}
