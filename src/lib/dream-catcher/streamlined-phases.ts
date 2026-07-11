/** Dream Catcher conversation phases — 12-question intake → vision → goals → life-plan summary → confirm. */

export const STREAMLINED_PHASES = ['intake', 'vision', 'goals', 'summary', 'confirm'] as const
export type StreamlinedPhase = (typeof STREAMLINED_PHASES)[number]

export const INTAKE_QUESTION_COUNT = 12

/** Themes help the AI extract structured data for dashboard + life modules. */
export const INTAKE_QUESTION_THEMES = [
  'priorities',
  'future_vision',
  'blockers_focus',
  'success_metrics',
  'quantifiable_goals',
  'projects_tasks',
  'habits',
  'education',
  'fitness_profile',
  'ruminations_coping',
  'gratitude',
  'key_relationships',
] as const

export const INTAKE_QUESTIONS: readonly string[] = [
  'What matters most to you right now? Tell me about your top priorities in your own words.',
  'Picture your life 1–2 years from now at its best. What does a great week look like?',
  "What's the biggest thing that gets in your way, and which up to three life areas do you want LifeStacks to help you make real progress in?",
  'How do you measure success for yourself? (numbers, milestones, feelings, habits — be specific if you can.)',
  'What are up to three quantifiable goals you want on your dashboard? Include target numbers, units, and timelines when possible.',
  'What projects would move those goals forward this month, and what weekly tasks will you commit to this week to build momentum?',
  'What daily habits would support your best self? List 2–4 small repeatable actions.',
  'What are you learning or want to learn? Describe education goals and how you will measure progress.',
  'What are your fitness goals and how will you measure them? Where are you starting from today? (workouts per week, weight, activity level, energy.)',
  'What thoughts, worries, or mental loops show up repeatedly — and what coping strategies help when you are stuck?',
  'What are you grateful for on a regular basis, and what gratitude practice would feel sustainable? (time of day, format, frequency.)',
  'Who are your top three friends or important people to stay connected with, and how often would you like to reach out to each?',
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
  return `INTAKE PROGRESS: question ${q + 1} of ${INTAKE_QUESTION_COUNT} (theme: ${getIntakeQuestionTheme(q)}).`
}

export function getStreamlinedPhaseInstructions(
  currentPhase: string,
  intakeQuestionIndex: number
): string {
  const phase = normalizeDreamCatcherPhase(currentPhase)

  if (phase === 'intake') {
    const q = Math.min(Math.max(intakeQuestionIndex, 0), INTAKE_QUESTION_COUNT - 1)
    const theme = getIntakeQuestionTheme(q)
    return `
You are in the INTAKE phase (${INTAKE_QUESTION_COUNT} questions total). Ask exactly ONE question at a time — warm, concise, no jargon.

You are on question ${q + 1} of ${INTAKE_QUESTION_COUNT} (theme: ${theme}). Ask this question:
"${INTAKE_QUESTIONS[q]}"

After the user answers:
- Acknowledge briefly (1 sentence).
- Extract structured data into assessment_data fields (see extraction map below).
- If question ${q + 1} < ${INTAKE_QUESTION_COUNT}, ask question ${q + 2} next (increment intake_question_index).
- After question ${INTAKE_QUESTION_COUNT} is answered, summarize what you heard in 2-3 sentences and transition to vision (set next_phase to "vision").

EXTRACTION MAP (merge into assessment_data; do not wipe prior entries):
- priorities/future_vision → personal_insights, dreams_discovered, personality_traits as relevant
- blockers_focus → blockers in personal_insights + focus_areas array
- success_metrics → measurement_preferences (string array)
- quantifiable_goals → goals_generated (with target_value, target_unit, timeline when mentioned)
- projects_tasks → project_ideas + task_ideas (array of { title, description, category })
- habits → habit_ideas (array of { title, description })
- education → education_items (array of { title, description, target_date, priority_level })
- fitness_profile → fitness_profile { goals[], baseline{} }
- ruminations_coping → ruminations (array of { description, severity, fear_type, coping_strategies[] })
- gratitude → gratitude_starters { items[], practice_idea, reflection }
- key_relationships → key_relationships (array of { name, relationship_type, notes, contact_frequency_days, priority_level })

Do NOT ask about executive skills inventories or long personality tests. Stay within these ${INTAKE_QUESTION_COUNT} questions.
`
  }

  if (phase === 'vision') {
    return `
You are in the VISION phase. Synthesize a vision statement from everything collected in intake (priorities, dreams, goals, fitness, relationships, gratitude).

Ask at most ONE clarifying question if the vision is still unclear. After 1-2 exchanges, write a polished vision_statement (2-4 sentences, present tense) and transition to goals (set next_phase to "goals").
Ensure goals_generated includes measurable targets (target_value, target_unit) wherever the user provided numbers.
`
  }

  if (phase === 'goals') {
    return `
You are in the GOALS phase. Refine and finalize 3-6 specific, measurable goals aligned with the vision and intake answers.

Each goal in goals_generated needs: goal, category, priority (high|medium|low), timeline, and when possible target_value + target_unit for dashboard measurement.

Ensure project_ideas, habit_ideas, task_ideas, education_items, fitness_profile, ruminations, gratitude_starters, and key_relationships are complete from intake — fill gaps only if critical.

After presenting the goals, transition to summary (set next_phase to "summary"). Tell the user you will reflect who they are before they review their Life Plan.
`
  }

  if (phase === 'summary') {
    return `
You are in the SUMMARY phase. Do NOT ask new intake questions.

Write a warm, personal life_plan_summary (3-5 paragraphs) that covers:
1. Who this person is (values, strengths, context from their answers)
2. What they are trying to accomplish (vision + top goals)
3. How their dashboard and modules will support them (goals/projects/tasks/habits, fitness, gratitude, relationships, focus on blocks)

Set life_plan_summary in assessment_data. Invite them to review the Life Plan preview below and confirm when ready. Transition to confirm (set next_phase to "confirm") after presenting the summary — user does not need to reply unless they want changes.
`
  }

  if (phase === 'confirm') {
    return `
You are in the CONFIRM phase. Do NOT ask new questions.

Summarize: vision, life_plan_summary highlights, and what will be created on the dashboard and in life modules (Fitness Tracker, Gratitude Journal, Relationship Manager, Focus Enhancer).

Tell the user to review the Life Plan preview panel and click "Confirm & Setup My Dashboard" when it looks right. Mention that existing dashboard items will be kept and new ones added.
`
  }

  return ''
}
