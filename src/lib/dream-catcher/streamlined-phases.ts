/** Dream Catcher conversation phases — 20-question intake → vision → goals → life-plan summary → confirm. */

export const STREAMLINED_PHASES = ['intake', 'vision', 'goals', 'summary', 'confirm'] as const
export type StreamlinedPhase = (typeof STREAMLINED_PHASES)[number]

export const INTAKE_QUESTION_COUNT = 20

/** Themes help the AI extract structured data for dashboard + life modules. */
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

export const INTAKE_QUESTIONS: readonly string[] = [
  'What matters most to you right now? Tell me about your top priorities in your own words.',
  'Picture your life 1–2 years from now at its best. What does a great week look like?',
  "What's the biggest thing that gets in your way or holds you back?",
  'Name up to three life areas where you want LifeStacks to help you make real progress.',
  'How do you measure success for yourself? (numbers, milestones, feelings, habits — be specific if you can.)',
  'What are up to three quantifiable goals you want on your dashboard? Include target numbers or units when possible.',
  'For your most important goal, what timeline are you working toward?',
  'What projects or initiatives would move those goals forward this month?',
  'What daily habits would support your best self? List 2–4 small repeatable actions.',
  'What weekly tasks would you commit to this week to build momentum?',
  'What are you learning or want to learn? Describe education goals and how you will measure progress.',
  'What are your fitness goals, and how will you measure them? (e.g. workouts per week, weight, energy, strength.)',
  'Where are you starting from today with fitness? (current baseline — weight, activity level, or habits.)',
  'What thoughts, worries, or mental loops show up repeatedly? These become starter ruminations in Focus Enhancer.',
  'What coping strategies help you when you are stuck, or what would you tell yourself in those moments?',
  'What are you grateful for on a regular basis? Share at least three things for your Gratitude Journal.',
  'What gratitude practice would feel sustainable for you? (time of day, format, frequency.)',
  'Who are your top three friends or important people to stay connected with? (names and how you know them.)',
  'How often would you like to reach out to each of those people?',
  'Anything else you want me to know before we build your Life Plan and dashboard?',
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
- priorities/future_vision/blockers/focus_areas → personal_insights, dreams_discovered, personality_traits as relevant
- success_metrics → measurement_preferences (string array)
- quantifiable_goals/goal_timelines → goals_generated (with target_value, target_unit, timeline when mentioned)
- projects → project_ideas (array of { title, description, category, linked_goal })
- habits → habit_ideas (array of { title, description })
- weekly_tasks → task_ideas (array of { title, description, category })
- education → education_items (array of { title, description, target_date, priority_level })
- fitness_goals/fitness_baseline → fitness_profile { goals[], baseline{} }
- ruminations/coping → ruminations (array of { description, severity, fear_type, coping_strategies[] })
- gratitude_items/gratitude_practice → gratitude_starters { items[], practice_idea, reflection }
- key_relationships/relationship_cadence → key_relationships (array of { name, relationship_type, notes, contact_frequency_days, priority_level })
- final_context → append to personal_insights

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
