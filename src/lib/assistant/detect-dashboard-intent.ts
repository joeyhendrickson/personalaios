/**
 * Detect natural-language intent to propose or commit dashboard plans from chat.
 */

export type DashboardIntent =
  | { type: 'commit_all' }
  | { type: 'propose_plan' }
  | { type: 'dismiss_plan' }
  | null

const COMMIT_ALL_PATTERNS = [
  /^yes\.?\s*(add|please|do it|go ahead)?/i,
  /^(yeah|yep|sure|ok|okay|confirm)\.?\s*(add|all|please)?/i,
  /^(add|confirm)\s+(it|them|all|everything)(\s+to(\s+my)?\s+dashboard)?\.?$/i,
  /^go ahead( and add( it(all)?)?)?\.?$/i,
  /^confirm\s+all\.?$/i,
  /^yes,?\s+(add|please add)( it(all)?| them)?( to (my )?dashboard)?\.?$/i,
  /^do it\.?$/i,
  /^sounds good,?\s*add/i,
  /^perfect,?\s*add/i,
]

const PROPOSE_PATTERNS = [
  /add (this|these|it|them|that|the conversation)( conversation)? to (my )?dashboard/i,
  /turn (this|the conversation|that) into (goals|projects|tasks|a plan)/i,
  /create (goals|projects|tasks|habits) (from|based on) (this|the conversation|that)/i,
  /put (this|these|that) on (my )?dashboard/i,
  /make (this|these) (into )?(dashboard )?(goals|projects|tasks)/i,
  /add to dashboard/i,
  /generate (a )?dashboard plan/i,
]

const DISMISS_PATTERNS = [
  /^no\.?\s*(thanks|thank you)?\.?$/i,
  /^never\s*mind\.?$/i,
  /^dismiss( the plan)?\.?$/i,
  /^skip( it)?\.?$/i,
  /^not now\.?$/i,
  /^cancel( the plan)?\.?$/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  const t = text.trim()
  return patterns.some((p) => p.test(t))
}

export function detectDashboardIntent(
  message: string,
  state: { hasDashboardPlan: boolean; hasGoalProposals: boolean }
): DashboardIntent {
  const t = message.trim()
  if (!t) return null

  if (state.hasDashboardPlan) {
    if (matchesAny(t, DISMISS_PATTERNS)) return { type: 'dismiss_plan' }
    if (matchesAny(t, COMMIT_ALL_PATTERNS)) return { type: 'commit_all' }
    if (/confirm\s+all/i.test(t)) return { type: 'commit_all' }
  }

  if (state.hasGoalProposals && matchesAny(t, COMMIT_ALL_PATTERNS)) {
    return { type: 'commit_all' }
  }

  if (!state.hasDashboardPlan && matchesAny(t, PROPOSE_PATTERNS)) {
    return { type: 'propose_plan' }
  }

  return null
}
