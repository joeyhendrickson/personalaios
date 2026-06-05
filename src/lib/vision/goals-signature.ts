/**
 * Stable signature of a user's goals (title + completion state).
 * Used to detect when goals have changed/completed so we can recommend a
 * vision-statement update. Shared by the vision API routes and onboarding
 * autofill so the stored signature and the live signature always match.
 */
export function computeGoalsSignature(
  goals: Array<{ title?: string | null; status?: string | null }>
): string {
  return (goals || [])
    .map((g) => {
      const title = (g.title || '').trim().toLowerCase()
      const done = (g.status || '').toLowerCase() === 'completed' ? '1' : '0'
      return `${title}|${done}`
    })
    .filter((part) => part.length > 1)
    .sort()
    .join('::')
}
