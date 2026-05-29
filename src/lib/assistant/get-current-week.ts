import type { SupabaseClient } from '@supabase/supabase-js'

export async function getOrCreateCurrentWeek(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existingWeeks, error: weekError } = await supabase
    .from('weeks')
    .select('id, week_start, week_end')
    .lte('week_start', today)
    .gte('week_end', today)
    .order('week_start', { ascending: false })
    .limit(1)

  if (weekError) {
    throw new Error('Failed to get current week')
  }

  if (existingWeeks && existingWeeks.length > 0) {
    return existingWeeks[0]
  }

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)

  const { data: newWeek, error: createError } = await supabase
    .from('weeks')
    .insert({
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: endOfWeek.toISOString().split('T')[0],
    })
    .select('id, week_start, week_end')
    .single()

  if (createError || !newWeek) {
    throw new Error('Failed to create current week')
  }

  return newWeek
}
