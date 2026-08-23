/** PostgREST / Postgres errors when budget_analyses.name is not in the live schema. */
export function isMissingBudgetAnalysesNameColumn(
  error: {
    code?: string
    message?: string
  } | null
): boolean {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  if (!message.includes('name')) return false

  return (
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    (message.includes('budget_analyses') &&
      (message.includes('schema cache') ||
        message.includes('does not exist') ||
        message.includes('undefined column')))
  )
}
