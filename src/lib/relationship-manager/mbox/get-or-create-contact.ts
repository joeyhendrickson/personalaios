import type { SupabaseClient } from '@supabase/supabase-js'

function normEmail(e: string | null | undefined): string | null {
  if (!e) return null
  const x = e.trim().toLowerCase()
  return x && x.includes('@') ? x : null
}

export async function getOrCreateRelationshipContact(
  supabase: SupabaseClient,
  userId: string,
  relationshipId: string,
  opts?: { primaryEmailOverride?: string | null }
): Promise<{ id: string; primary_email: string | null; aliases: unknown[] }> {
  const { data: rel, error: relErr } = await supabase
    .from('relationships')
    .select('id, name, email')
    .eq('id', relationshipId)
    .eq('user_id', userId)
    .single()

  if (relErr || !rel) {
    throw new Error('Relationship not found')
  }

  const { data: existing } = await supabase
    .from('relationship_contacts')
    .select('aliases')
    .eq('relationship_id', relationshipId)
    .maybeSingle()

  const aliasRows = await supabase
    .from('relationship_aliases')
    .select('alias')
    .eq('relationship_id', relationshipId)
    .eq('user_id', userId)

  const merge = new Set<string>()
  for (const row of aliasRows.data || []) {
    const a = normEmail(String(row.alias || ''))
    if (a) merge.add(a)
  }
  for (const a of (existing?.aliases as string[] | undefined) || []) {
    const n = normEmail(a)
    if (n) merge.add(n)
  }

  const primary =
    normEmail(opts?.primaryEmailOverride ?? undefined) ||
    normEmail(rel.email as string | null | undefined)

  if (primary) merge.add(primary)

  const aliasList = [...merge].filter((e) => e !== primary).sort()

  const { data: row, error } = await supabase
    .from('relationship_contacts')
    .upsert(
      {
        user_id: userId,
        relationship_id: relationshipId,
        display_name: String(rel.name || 'Contact'),
        primary_email: primary,
        aliases: aliasList,
        metadata: {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'relationship_id' }
    )
    .select('id, primary_email, aliases')
    .single()

  if (error || !row) {
    throw new Error(error?.message || 'Failed to save contact record')
  }

  return {
    id: row.id,
    primary_email: row.primary_email,
    aliases: Array.isArray(row.aliases) ? row.aliases : [],
  }
}
