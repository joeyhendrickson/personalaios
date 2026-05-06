import type { SupabaseClient } from '@supabase/supabase-js'

/** Trimmed lowercase — used for duplicate detection. */
export function normalizeRewardDescription(text: string | null | undefined): string {
  return (text ?? '').trim().toLowerCase()
}

/**
 * Available Rewards list: hide rows that duplicate another reward's description (exact text after normalize).
 * Empty descriptions are keyed by normalized name so unrelated blanks don't collapse into one row.
 */
export function dedupeRewardsForAvailableByDescription<
  T extends { name: string; description?: string | null },
>(rewards: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rewards) {
    const rawDesc = (r.description ?? '').trim()
    const key =
      rawDesc.length > 0
        ? `d:${rawDesc.toLowerCase()}`
        : `nd:${(r.name ?? '').trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

export async function assertRewardDescriptionUnique(
  supabase: SupabaseClient,
  description: string | undefined | null,
  options: { excludeRewardId?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const normalized = normalizeRewardDescription(description ?? '')
  if (normalized.length === 0) return { ok: true }

  const { data: rows, error } = await supabase
    .from('rewards')
    .select('id, description')
    .eq('is_active', true)

  if (error) {
    console.error('assertRewardDescriptionUnique:', error)
    return { ok: false, message: 'Could not validate reward description.' }
  }

  const dup = rows?.some(
    (r) =>
      r.id !== options.excludeRewardId && normalizeRewardDescription(r.description) === normalized
  )

  if (dup) {
    return {
      ok: false,
      message:
        'A reward with this description already exists. Change the description so it is unique.',
    }
  }
  return { ok: true }
}
