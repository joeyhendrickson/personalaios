/** Dream Catcher conversation phases — adaptive intake → vision → goals → life-plan summary → confirm. */

import { DREAM_CATCHER_LIMITS, formatPlanLimitsForPrompt } from '@/lib/dream-catcher/plan-limits'

export const STREAMLINED_PHASES = ['intake', 'vision', 'goals', 'summary', 'confirm'] as const
export type StreamlinedPhase = (typeof STREAMLINED_PHASES)[number]

export const INTAKE_QUESTION_COUNT = DREAM_CATCHER_LIMITS.intakeQuestions

/** Themes guide what to explore — questions adapt to the user's answers; they need not follow a fixed script. */
export const INTAKE_QUESTION_THEMES = [
  'priorities',
  'future_vision',
  'blockers',
  'focus_areas',
  'success_metrics',
  'quantifiable_goals',
  'goal_timelines',
  'projects',
  'habits',
  'weekly_tasks',
  'education',
  'fitness_goals',
  'fitness_baseline',
  'ruminations',
  'coping',
  'gratitude_items',
  'gratitude_practice',
  'key_relationships',
  'relationship_cadence',
  'final_context',
] as const

/** Example prompts per theme — use as inspiration, not a rigid script. */
export const INTAKE_QUESTION_EXAMPLES: readonly string[] = [
  'What matters most to you right now? Tell me about your top priorities in your own words.',
  'Picture your life 1–2 years from now at its best. What does a great week look like?',
  "What's the biggest thing that gets in your way or holds you back?",
  'Name up to three life areas where you want LifeStacks to help you make real progress.',
  'How do you measure success for yourself? (numbers, milestones, feelings, habits — be specific if you can.)',
  'What are 2–4 quantifiable goals you want on your dashboard? Include target numbers or units when possible.',
  'For your most important goal, what timeline are you working toward?',
  'What projects or initiatives would move those goals forward this month?',
  'What daily habits would support your best self? List a few small repeatable actions.',
  'What weekly tasks would you commit to this week to build momentum?',
  'What are you learning or want to learn? Describe education goals and how you will measure progress.',
  'What are your fitness goals, and how will you measure them?',
  'Where are you starting from today with fitness? (current baseline — weight, activity level, or habits.)',
  'What thoughts, worries, or mental loops show up repeatedly?',
  'What coping strategies help you when you are stuck?',
  'What are you grateful for on a regular basis? Share at least three things.',
  'What gratitude practice would feel sustainable for you?',
  'Who are your top friends or important people to stay connected with?',
  'How often would you like to reach out to those people?',
  'Anything else you want me to know before we build your Life Plan and dashboard?',
]

/** @deprecated use INTAKE_QUESTION_EXAMPLES — kept for backward compatibility */
export const INTAKE_QUESTIONS = INTAKE_QUESTION_EXAMPLES

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
    summary: 'summary',
    confirm: 'confirm',
    intake: 'intake',
  }
  return legacyToStreamlined[phase] ?? phase
}

export function getIntakeQuestionTheme(index: number): string {
  return INTAKE_QUESTION_THEMES[Math.min(Math.max(index, 0), INTAKE_QUESTION_COUNT - 1)]
}

export function getIntakeQuestionContext(
  intakeQuestionIndex: number,
  currentPhase: string
): string {
  if (normalizeDreamCatcherPhase(currentPhase) !== 'intake') return ''
  const q = Math.min(Math.max(intakeQuestionIndex, 0), INTAKE_QUESTION_COUNT - 1)
  return `INTAKE PROGRESS: question ${q + 1} of ${INTAKE_QUESTION_COUNT} (theme: ${getIntakeQuestionTheme(q)}). Target session length: ~10–${DREAM_CATCHER_LIMITS.intakeMinutesMax} minutes total.`
}

export function getStreamlinedPhaseInstructions(
  currentPhase: string,
  intakeQuestionIndex: number
): string {
  const phase = normalizeDreamCatcherPhase(currentPhase)

  if (phase === 'intake') {
    const q = Math.min(Math.max(intakeQuestionIndex, 0), INTAKE_QUESTION_COUNT - 1)
    const theme = getIntakeQuestionTheme(q)
    const example = INTAKE_QUESTION_EXAMPLES[q]
    return `
You are in the INTAKE phase. Ask exactly ONE question at a time — warm, concise, conversational.

PROGRESS: question ${q + 1} of ${INTAKE_QUESTION_COUNT} (theme: ${theme}).
The conversation does NOT need to follow a fixed script. Use the theme as a guide and adapt your question based on what the user already shared. Skip or combine themes if the user already answered that area clearly.

Example question for this theme (adapt, do not copy verbatim if redundant):
"${example}"

After the user answers:
- Acknowledge briefly (1 sentence).
- Extract ONLY NEW structured data into assessment_data (see extraction map). Do NOT re-send entire arrays — only items learned from this answer.
- Keep draft goals to at most ${DREAM_CATCHER_LIMITS.goals.max} entries total during intake.
- Increment intake_question_index by 1.
- If question ${q + 1} < ${INTAKE_QUESTION_COUNT}, ask the next natural question (next theme: ${getIntakeQuestionTheme(Math.min(q + 1, INTAKE_QUESTION_COUNT - 1))}).
- After question ${INTAKE_QUESTION_COUNT} is answered (or intake_question_index >= ${INTAKE_QUESTION_COUNT}), summarize what you heard in 2-3 sentences and transition to vision (set next_phase to "vision").

EXTRACTION MAP (merge into assessment_data; only add NEW items from this answer):
- priorities/future_vision/blockers/focus_areas → personal_insights, dreams_discovered, personality_traits as relevant
- success_metrics → measurement_preferences (string array)
- quantifiable_goals/goal_timelines → goals_generated (with target_value, target_unit, timeline when mentioned)
- projects → project_ideas (array of { title, description, category, linked_goal })
- habits → habit_ideas (array of { title, description })
- weekly_tasks → task_ideas (array of { title, description, category })
- education → education_items
- fitness_goals/fitness_baseline → fitness_profile { goals[], baseline{} }
- ruminations/coping → ruminations
- gratitude_items/gratitude_practice → gratitude_starters { items[], practice_idea, reflection }
- key_relationships/relationship_cadence → key_relationships
- final_context → append to personal_insights

Do NOT ask about executive skills inventories or long personality tests. Complete intake within ${INTAKE_QUESTION_COUNT} questions (~10–${DREAM_CATCHER_LIMITS.intakeMinutesMax} minutes).
`
  }

  if (phase === 'vision') {
    return `
You are in the VISION phase. Synthesize a vision statement from everything collected in intake.

Ask at most ONE clarifying question if the vision is still unclear. After 1-2 exchanges, write a polished vision_statement (2-4 sentences, present tense) and transition to goals (set next_phase to "goals").
`
  }

  if (phase === 'goals') {
    return `
You are in the GOALS phase. Refine and finalize ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} specific, measurable goals aligned with the vision and intake answers.

Each goal in goals_generated needs: goal, category, priority (high|medium|low), timeline, and target_value + target_unit for dashboard measurement. Descriptions must include how completion will be measured.

Replace goals_generated with the final ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} goals (do not append duplicates).
Ensure project_ideas (${DREAM_CATCHER_LIMITS.projects.min}-${DREAM_CATCHER_LIMITS.projects.max} total), task_ideas (${DREAM_CATCHER_LIMITS.tasks.min}-${DREAM_CATCHER_LIMITS.tasks.max} total), and habit_ideas (up to ${DREAM_CATCHER_LIMITS.habits.max}) are aligned to those goals — fill gaps only if critical.

After presenting the goals, transition to summary (set next_phase to "summary").
`
  }

  if (phase === 'summary') {
    return `
You are in the SUMMARY phase. Do NOT ask new intake questions.

Write a warm, personal life_plan_summary (3-5 paragraphs) covering who this person is, what they are building, and how their dashboard will support them.

Set life_plan_summary in assessment_data. Transition to confirm (set next_phase to "confirm") after presenting the summary.
`
  }

  if (phase === 'confirm') {
    return `
You are in the CONFIRM phase. Do NOT ask new questions.

Summarize vision, life_plan_summary highlights, and what will be created:
${formatPlanLimitsForPrompt()}

Tell the user to review the Life Plan preview panel and click "Confirm & Setup My Dashboard" when it looks right.
`
  }

  return ''
}
