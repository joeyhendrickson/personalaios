/**
 * Detect when the Advisor assistant message claims it is building proposal cards
 * or offers to add something to the dashboard. The client must call
 * /api/assistant/actions/propose separately so a checkmark can appear in chat.
 */
export function advisorPromisedProposalCards(assistantText: string): boolean {
  const t = assistantText.toLowerCase()
  if (!t.trim()) return false

  if (/prepar(ing|e)\s+(the\s+)?proposal/.test(t)) return true
  if (/proposal card/.test(t)) return true
  if (/will appear for your review/.test(t) && /confirm\s*&\s*add/i.test(assistantText)) return true
  if (
    /nothing will be saved until you tap confirm/i.test(t) &&
    /proposal|dashboard|habit|goal/.test(t)
  ) {
    return true
  }
  if (/summary i['']m building now/i.test(t) && /confirm\s*&\s*add/i.test(assistantText))
    return true

  return false
}

/** Advisor asked in-chat whether to add an item; show a checkmark. */
export function advisorOfferedDashboardAdd(assistantText: string): boolean {
  if (advisorPromisedProposalCards(assistantText)) return true

  const t = assistantText.toLowerCase()
  if (!t.trim()) return false

  if (/\bcheckmark\b/.test(t) && /\b(tap|click|press|use|hit|push)\b/.test(t)) return true
  if (
    /\b(want me to add|shall i add|should i add|i can add (this|that|it)|i'?ll add (this|that|it)|let me add|i can put (this|that|it))\b/.test(
      t
    )
  ) {
    return true
  }
  if (/\badd (this|that|it) to (your |the |my )?dashboard\b/.test(t)) return true
  if (/\badd (this|that|it) as (a |an )?(goal|habit|task|project|education)\b/.test(t)) return true
  if (/\b(want|add|put)\b.{0,80}\bon (your |the )?dashboard\b/.test(t)) return true

  return false
}
