/** Dream Catcher — intake → vision → goals → projects → tasks → life-plan summary → confirm. */

import { DREAM_CATCHER_LIMITS, formatPlanLimitsForPrompt } from '@/lib/dream-catcher/plan-limits'

export const STREAMLINED_PHASES = [
  'intake',
  'vision',
  'goals',
  'projects',
  'tasks',
  'summary',
  'confirm',
] as const
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
  'What projects, strategies, or milestones would move those goals forward? Name concrete initiatives — not the goals themselves.',
  'What daily habits would support your best self? List a few small repeatable actions.',
  'What weekly tasks or step-by-step tactics will you take to deploy your projects? Name concrete actions and which project each supports.',
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
    projects: 'projects',
    tasks: 'tasks',
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
  return `INTAKE THEME (internal only): ${getIntakeQuestionTheme(q)} [${q + 1}/${INTAKE_QUESTION_COUNT}]. Never tell the user this index, remaining count, or how long intake takes. Keep the chat feeling quick — one short question, then move. Skip or combine later themes if already answered. Finish intake before ${INTAKE_QUESTION_COUNT} when you have enough to draft a Life Plan.`
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
You are in the INTAKE phase. Ask exactly ONE short question — warm, conversational, never a list of questions.

PACE (critical): Keep each assistant message under 3 short sentences. Acknowledge in a few words, then ask the next question. NEVER mention question numbers, remaining questions, totals, or how long this will take. Treat tap-chip replies and "Skip this one" as complete answers — do not re-ask.

Internal theme: ${theme} [${q + 1}/${INTAKE_QUESTION_COUNT}]. Use the theme as a guide and adapt based on what the user already shared. Skip or combine themes if that area is already clear. Prefer finishing intake early when answers are rich enough to draft goals, projects, and first steps.

Example question for this theme (adapt, do not copy verbatim if redundant):
"${example}"

After the user answers:
- Acknowledge briefly (a few words, not a recap).
- Extract ONLY NEW structured data into assessment_data (see extraction map). Do NOT re-send entire arrays — only items learned from this answer.
- Keep draft goals to at most ${DREAM_CATCHER_LIMITS.goals.max} entries total during intake.
- Increment intake_question_index by 1 (or jump ahead if you skipped themes).
- If more is needed and ${q + 1} < ${INTAKE_QUESTION_COUNT}, ask the next natural question (next theme: ${getIntakeQuestionTheme(Math.min(q + 1, INTAKE_QUESTION_COUNT - 1))}).
- As soon as you have enough for a Life Plan — or after question ${INTAKE_QUESTION_COUNT} — give a 1-sentence recap and transition to vision (set next_phase to "vision").

EXTRACTION MAP (merge into assessment_data; only add NEW items from this answer):
- priorities/future_vision/blockers/focus_areas → personal_insights, dreams_discovered, personality_traits as relevant
- success_metrics → measurement_preferences (string array)
- quantifiable_goals/goal_timelines → goals_generated (with target_value, target_unit, timeline, description when mentioned)
- projects/blockers/strategies/focus_areas → project_ideas (array of { title, description, category, linked_goal })
  - title = a milestone or initiative (e.g. "Build client outreach list"), NEVER the same as a goal title
  - description = how this step supports the linked goal, using the user's own words when possible
  - linked_goal = exact goal title this project supports
- habits → habit_ideas (array of { title, description })
- weekly_tasks/tactics/steps → task_ideas (array of { title, description, category, linked_project, step_order })
  - title = a concrete action the user will do (verb-first when possible)
  - description = unique details from intake — why this step matters
  - linked_project = exact project title this task supports (required when projects exist)
  - step_order = optional sequence number within the project
- education → education_items
- fitness_goals/fitness_baseline → fitness_profile { goals[], baseline{} }
- ruminations/coping → ruminations
- gratitude_items/gratitude_practice → gratitude_starters { items[], practice_idea, reflection }
- key_relationships/relationship_cadence → key_relationships
- final_context → append to personal_insights

Do NOT ask about executive skills inventories or long personality tests. Cap intake at ${INTAKE_QUESTION_COUNT} questions; finish sooner when you can.
`
  }

  if (phase === 'vision') {
    return `
You are in the VISION phase. Synthesize a vision statement from everything collected in intake.

Keep it snappy: at most ONE clarifying question if needed, then a polished vision_statement (2-3 sentences, present tense) and transition to goals (set next_phase to "goals"). Never mention remaining steps or duration.
`
  }

  if (phase === 'goals') {
    return `
You are in the GOALS phase. Finalize ONLY the ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} dashboard goals — do not finalize projects or tasks yet.

Each goal in goals_generated needs: goal, description (unique — why this matters + how success is measured), category, priority (high|medium|low), timeline, target_value + target_unit.

Replace goals_generated with the final ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} goals (do not append duplicates).
Present the finalized goals as a short bullet list (one line each), then transition to projects (set next_phase to "projects"). Keep the message under ~3 sentences plus bullets.
`
  }

  if (phase === 'projects') {
    return `
You are in the PROJECTS phase. The goals are already finalized — now define ${DREAM_CATCHER_LIMITS.projects.min}-${DREAM_CATCHER_LIMITS.projects.max} unique projects/strategies that ADD UP TO those goals.

RULES:
- Each project is a milestone or initiative — NEVER copy or rephrase a goal title
- Use strategies and approaches the user mentioned during intake
- Every project needs: title, description (unique, contextual), category, linked_goal (exact finalized goal title)
- Distribute projects across goals (at least one project per major goal when possible)
- Do NOT finalize tasks in this phase — only project_ideas

Replace project_ideas with the final ${DREAM_CATCHER_LIMITS.projects.min}-${DREAM_CATCHER_LIMITS.projects.max} projects (do not append duplicates).
Present the projects as a short grouped list, then transition to tasks (set next_phase to "tasks"). Keep the message tight — no lectures.
`
  }

  if (phase === 'tasks') {
    return `
You are in the TASKS phase. Goals and projects are finalized — now define ${DREAM_CATCHER_LIMITS.tasks.min}-${DREAM_CATCHER_LIMITS.tasks.max} concrete tactics/steps the user will take to execute those projects.

RULES:
- Each task is a specific action (setup, outreach, research, practice, review, etc.) — NOT a goal or project restatement
- Use step-by-step actions the user mentioned during intake
- Every task needs: title, description (unique — what to do and why), category, linked_project (exact finalized project title)
- Optional step_order for sequence within a project
- Spread tasks across projects (at least 1 task per project; 2-4 per major project when the user gave enough detail)
- habit_ideas (up to ${DREAM_CATCHER_LIMITS.habits.max}) may be refined here if mentioned

Replace task_ideas with the final ${DREAM_CATCHER_LIMITS.tasks.min}-${DREAM_CATCHER_LIMITS.tasks.max} tasks (do not append duplicates).
Present tasks as a short grouped list, then transition to summary (set next_phase to "summary"). Keep the message tight.
`
  }

  if (phase === 'summary') {
    return `
You are in the SUMMARY phase. Do NOT ask new intake questions.

Write a warm, personal life_plan_summary in 2 short paragraphs covering who this person is, what they are building, and how their dashboard will support them. Do not write an essay.

Set life_plan_summary in assessment_data. Transition to confirm (set next_phase to "confirm") after presenting the summary.
`
  }

  if (phase === 'confirm') {
    return `
You are in the CONFIRM phase. Do NOT ask new questions.

Summarize vision, life_plan_summary highlights, and what will be created:
${formatPlanLimitsForPrompt()}

Tell the user to review the Life Plan preview panel and click "Confirm & Setup My Dashboard" when it looks right. Keep this under 3 sentences. Never mention remaining questions or duration.
`
  }

  return ''
}

export type ReplyChip = { label: string; value: string }

export const JOURNEY_BEATS = ['catch', 'shape', 'lock'] as const
export type JourneyBeat = (typeof JOURNEY_BEATS)[number]

const SKIP_REPLY_CHIP: ReplyChip = {
  label: 'Skip this one',
  value: 'Skip this one — nothing more to add. Please keep going.',
}

function chips(...pairs: [string, string][]): ReplyChip[] {
  return [...pairs.map(([label, value]) => ({ label, value })), SKIP_REPLY_CHIP]
}

type IntakeTheme = (typeof INTAKE_QUESTION_THEMES)[number]

const INTAKE_REPLY_CHIPS: Record<IntakeTheme, ReplyChip[]> = {
  priorities: chips(
    ['Career', 'Career and meaningful work matter most to me right now.'],
    ['Health & energy', 'Health and energy matter most to me right now.'],
    ['Family', 'Family and close relationships matter most to me right now.'],
    ['Money', 'Money and financial stability matter most to me right now.']
  ),
  future_vision: chips(
    ['More freedom', 'A great week looks like more freedom and less scramble.'],
    ['Stronger body', 'A great week looks like feeling strong, healthy, and energized.'],
    ['Closer people', 'A great week looks like closer time with the people I care about.'],
    ['Creative life', 'A great week looks like making space for creative work.']
  ),
  blockers: chips(
    ['Time', 'Time is the biggest thing that gets in my way.'],
    ['Energy', 'Low energy is the biggest thing that holds me back.'],
    ['Money', 'Money is the biggest constraint right now.'],
    ['Self-doubt', 'Self-doubt is the biggest thing that holds me back.']
  ),
  focus_areas: chips(
    ['Work', 'I want LifeStacks to help me make real progress at work.'],
    ['Health', 'I want LifeStacks to help me make real progress on health.'],
    ['Home life', 'I want LifeStacks to help me make real progress at home.'],
    ['Learning', 'I want LifeStacks to help me make real progress on learning.']
  ),
  success_metrics: chips(
    ['Numbers', 'I measure success with numbers and targets.'],
    ['Milestones', 'I measure success by hitting clear milestones.'],
    ['How I feel', 'I measure success by how I feel day to day.'],
    ['Habits', 'I measure success by the habits I keep.']
  ),
  quantifiable_goals: chips(
    ['2 clear goals', 'I want two clear, measurable goals on my dashboard.'],
    ['3–4 goals', 'I want three or four measurable goals on my dashboard.'],
    ['Still figuring it out', 'I am still figuring out the exact numbers — help me shape them.']
  ),
  goal_timelines: chips(
    ['90 days', 'My most important goal is on a 90-day timeline.'],
    ['6 months', 'My most important goal is on a 6-month timeline.'],
    ['1 year', 'My most important goal is on a 1-year timeline.'],
    ['2 years', 'My most important goal is on a 2-year timeline.']
  ),
  projects: chips(
    ['One big project', 'One focused project would move my main goal forward.'],
    ['A few small ones', 'A few smaller projects would move my goals forward.'],
    ['Not sure yet', 'I am not sure which projects yet — suggest a few from what I shared.']
  ),
  habits: chips(
    ['Morning routine', 'A short morning routine would support my best self.'],
    ['Movement', 'Daily movement is the habit I want most.'],
    ['Deep work', 'A daily deep-work block would support my best self.'],
    ['Rest', 'Protecting rest would support my best self.']
  ),
  weekly_tasks: chips(
    ['3 weekly actions', 'About three concrete weekly actions will move my projects.'],
    ['Daily check-in', 'A daily check-in is the tactic I will actually do.'],
    ['Weekend planning', 'A weekend planning session is how I will deploy my projects.']
  ),
  education: chips(
    ['A course', 'I want to complete a course and measure progress by finishing modules.'],
    ['Reading', 'I want a reading practice and will measure it by books or pages.'],
    ['A work skill', 'I want to learn a skill for work and measure it by using it on the job.'],
    ['Not right now', 'Education is not a focus for me right now.']
  ),
  fitness_goals: chips(
    ['Strength', 'My fitness goal is getting stronger, measured by consistent training.'],
    ['Cardio', 'My fitness goal is cardio endurance, measured by regular sessions.'],
    ['Weight', 'My fitness goal is a healthier weight, measured over time.'],
    ['Just show up', 'My fitness goal is consistency — showing up most days.']
  ),
  fitness_baseline: chips(
    ['Just starting', 'I am just starting with fitness from a low baseline.'],
    ['Somewhat active', 'I am somewhat active already but inconsistent.'],
    ['Training regularly', 'I already train regularly and want to level up.']
  ),
  ruminations: chips(
    ['Work stress', 'Work stress loops in my head a lot.'],
    ['Health worry', 'Health worries show up repeatedly.'],
    ['Relationships', 'Relationship worries show up repeatedly.'],
    ['Not much', 'I do not have a strong mental loop right now.']
  ),
  coping: chips(
    ['Walks', 'Walks help me when I am stuck.'],
    ['Talking it out', 'Talking it out with someone helps me when I am stuck.'],
    ['Journaling', 'Journaling helps me when I am stuck.'],
    ['Breathing', 'Breathing or a short pause helps me when I am stuck.']
  ),
  gratitude_items: chips(
    ['People', 'I am regularly grateful for the people in my life.'],
    ['Health', 'I am regularly grateful for my health.'],
    ['Work', 'I am regularly grateful for my work and the chance to grow.'],
    ['Small daily things', 'I am regularly grateful for small daily things.']
  ),
  gratitude_practice: chips(
    ['Nightly notes', 'A short nightly gratitude note would feel sustainable.'],
    ['Morning pause', 'A morning pause to name one thing would feel sustainable.'],
    ['Share with someone', 'Sharing gratitude with someone would feel sustainable.']
  ),
  key_relationships: chips(
    ['Partner', 'My partner is the most important person to stay connected with.'],
    ['Family', 'Family are the most important people to stay connected with.'],
    ['Close friends', 'A few close friends are the most important people to stay connected with.'],
    ['Mentor', 'A mentor or coach is an important person to stay connected with.']
  ),
  relationship_cadence: chips(
    ['Weekly', 'I would like to reach out weekly.'],
    ['Every 2 weeks', 'I would like to reach out every two weeks.'],
    ['Monthly', 'I would like to reach out monthly.']
  ),
  final_context: chips(
    ["That's everything", "That's everything I want you to know before we build the Life Plan."],
    ['One more thought', 'One more thought: please use everything I already shared and keep going.']
  ),
}

const PHASE_REPLY_CHIPS: Partial<Record<StreamlinedPhase, ReplyChip[]>> = {
  vision: chips(
    ['That’s the vibe', 'Yes — that vision matches. Keep going.'],
    ['Make it bolder', 'Close, but make the vision a bit bolder and more specific.']
  ),
  goals: chips(
    ['Those goals work', 'Those goals work. Keep going.'],
    ['Tweak the targets', 'Close — please tweak the targets to better match what I said.']
  ),
  projects: chips(
    ['Those projects work', 'Those projects work. Keep going.'],
    ['Fewer projects', 'A bit much — please keep fewer, more focused projects.']
  ),
  tasks: chips(
    ['Good first steps', 'Those first steps look good. Keep going.'],
    ['Make them smaller', 'Please make the first steps smaller and more doable this week.']
  ),
  summary: [
    { label: 'Looks right', value: 'The Life Plan looks right. Let’s lock it in.' },
    {
      label: 'Change something',
      value: 'Almost — please change the parts that do not match what I shared.',
    },
  ],
  confirm: [],
}

export function getJourneyBeat(phase: string): JourneyBeat {
  const n = normalizeDreamCatcherPhase(phase)
  if (n === 'intake') return 'catch'
  if (n === 'vision' || n === 'goals' || n === 'projects' || n === 'tasks') return 'shape'
  return 'lock'
}

export function getJourneyBeatLabel(phase: string, intakeQuestionIndex: number): string {
  const n = normalizeDreamCatcherPhase(phase)
  if (n === 'intake') {
    if (intakeQuestionIndex <= 5) return 'Catching the dream'
    if (intakeQuestionIndex <= 12) return 'Getting specific'
    return 'Almost ready to sketch'
  }
  if (n === 'vision') return 'Sketching your vision'
  if (n === 'goals') return 'Naming your goals'
  if (n === 'projects') return 'Choosing projects'
  if (n === 'tasks') return 'Laying out first steps'
  if (n === 'summary') return 'Your Life Plan'
  return 'Lock it in'
}

/** Tappable one-beat answers for the current question. Empty in confirm. */
export function getReplyChips(phase: string, intakeQuestionIndex: number): ReplyChip[] {
  const n = normalizeDreamCatcherPhase(phase)
  if (n === 'intake') {
    const theme = getIntakeQuestionTheme(intakeQuestionIndex) as IntakeTheme
    return INTAKE_REPLY_CHIPS[theme] ?? chips()
  }
  return PHASE_REPLY_CHIPS[n as StreamlinedPhase] ?? []
}
