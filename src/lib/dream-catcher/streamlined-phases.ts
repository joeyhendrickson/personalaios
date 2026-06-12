/** Streamlined Dream Catcher conversation phases (replaces 8-phase / 20-question flow). */

export const STREAMLINED_PHASES = ['intake', 'vision', 'goals', 'confirm'] as const
export type StreamlinedPhase = (typeof STREAMLINED_PHASES)[number]

export const INTAKE_QUESTION_COUNT = 5

const INTAKE_QUESTIONS = [
  'What matters most to you right now? Tell me about your top priorities in your own words.',
  'Picture your life 1–2 years from now at its best. What does a great week look like?',
  "What's the biggest thing that gets in your way or holds you back?",
  'Name up to three areas where you want LifeStacks to help you make progress.',
  'Anything else you want me to know before we build your starter dashboard?',
]

export function normalizeDreamCatcherPhase(phase: string): StreamlinedPhase | string {
  const legacyToStreamlined: Record<string, StreamlinedPhase> = {
    personality: 'intake',
    assessment: 'intake',
    influences: 'intake',
    'executive-skills': 'intake',
    'executive-blocking': 'intake',
    dreams: 'intake',
    vision: 'vision',
    goals: 'goals',
    confirm: 'confirm',
    intake: 'intake',
  }
  return legacyToStreamlined[phase] ?? phase
}

export function getStreamlinedPhaseInstructions(
  currentPhase: string,
  intakeQuestionIndex: number
): string {
  const phase = normalizeDreamCatcherPhase(currentPhase)

  if (phase === 'intake') {
    const q = Math.min(Math.max(intakeQuestionIndex, 0), INTAKE_QUESTION_COUNT - 1)
    return `
You are in the INTAKE phase. Ask exactly ONE question at a time — warm, concise, no jargon.

You are on question ${q + 1} of ${INTAKE_QUESTION_COUNT}. Ask this question:
"${INTAKE_QUESTIONS[q]}"

After the user answers:
- Acknowledge briefly (1 sentence).
- Extract personality_traits, personal_insights, dreams_discovered, and influences_identified from their answers when relevant.
- If question ${q + 1} < ${INTAKE_QUESTION_COUNT}, ask question ${q + 2} next (increment intake_question_index).
- After question ${INTAKE_QUESTION_COUNT} is answered, summarize what you heard in 2-3 sentences and transition to the vision phase (set next_phase to "vision").

Do NOT ask about executive skills, blocking factors, or long personality inventories. Keep the whole intake to these ${INTAKE_QUESTION_COUNT} questions only.
`
  }

  if (phase === 'vision') {
    return `
You are in the VISION phase. Help the user craft one inspiring vision statement (2-4 sentences, present tense).

Ask at most ONE clarifying question if needed. After 1-2 exchanges, write a polished vision_statement and transition to goals (set next_phase to "goals").
`
  }

  if (phase === 'goals') {
    return `
You are in the GOALS phase. Generate 3-5 specific, measurable goals aligned with their vision.

Each goal needs: goal, category (Career|Health|Relationships|Personal Growth|Finance|Other), priority (high|medium|low), timeline (1 month|3 months|6 months|1 year|2+ years).

After presenting the goals, transition to confirm (set next_phase to "confirm"). Tell the user to review the dashboard preview below and confirm when ready — do NOT ask more questions in confirm phase.
`
  }

  if (phase === 'confirm') {
    return `
You are in the CONFIRM phase. Do NOT ask new questions.

Summarize: vision, top dreams, and the goals plan. Tell the user to review the dashboard preview panel (goals, projects, tasks, habits) and click "Confirm & Set Up Dashboard" when it looks right. Mention that existing dashboard items will be kept and new ones will be added.
`
  }

  return getStreamlinedPhaseInstructions('intake', intakeQuestionIndex)
}

export function getIntakeQuestionContext(
  intakeQuestionIndex: number,
  currentPhase: string
): string {
  const phase = normalizeDreamCatcherPhase(currentPhase)
  if (phase !== 'intake') return ''
  if (intakeQuestionIndex >= INTAKE_QUESTION_COUNT) {
    return '\n\nIntake questions complete. Summarize and move to vision phase.'
  }
  return `\n\nCURRENT: intake question ${intakeQuestionIndex + 1} of ${INTAKE_QUESTION_COUNT}.`
}
