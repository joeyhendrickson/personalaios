/**
 * Detect when the Advisor assistant message claims it is building proposal cards.
 * The chat model often says this; the client must call /api/assistant/actions/propose separately.
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
