/**
 * Detect natural-language intent to propose or commit dashboard plans from chat.
 */

export type DashboardIntent =
  | { type: 'commit_all' }
  | { type: 'propose_plan' }
  | { type: 'dismiss_plan' }
  | { type: 'dismiss_actions' }
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
  /turn (this|the conversation|that) into (goals|projects|tasks|habits|a plan)/i,
  /create (goals|projects|tasks|habits) (from|based on) (this|the conversation|that)/i,
  /put (this|these|that) on (my )?dashboard/i,
  /make (this|these) (into )?(dashboard )?(goals|projects|tasks|habits)/i,
  /add to dashboard/i,
  /generate (a )?dashboard plan/i,
  /add (a |an |the |this |my )?(new )?habit\b/i,
  /create (a |an |the )?(new )?habit\b/i,
  /set up (a |an )?(new )?habit\b/i,
  /put (a |an )?habit (on|to|in(to)?) (my )?(dashboard|habits)/i,
  /add .{0,80} (to|on|in(to)?) (my )?(dashboard|habits( section)?)/i,
  /can you add (a |an )?(new )?habit/i,
  /please add (a |an )?(new )?habit/i,
  /add (a |an |the )?(new )?(goal|project|task)\b/i,
  /create (a |an |the )?(new )?(goal|project|task)\b/i,
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
  state: {
    hasDashboardPlan: boolean
    hasGoalProposals: boolean
    hasPendingActions?: boolean
  }
): DashboardIntent {
  const t = message.trim()
  if (!t) return null

  if (state.hasPendingActions) {
    if (matchesAny(t, DISMISS_PATTERNS)) return { type: 'dismiss_actions' }
    if (matchesAny(t, COMMIT_ALL_PATTERNS)) return { type: 'commit_all' }
    if (/confirm\s+all/i.test(t)) return { type: 'commit_all' }
  }

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
