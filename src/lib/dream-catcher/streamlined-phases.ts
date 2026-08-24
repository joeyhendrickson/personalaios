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

export const DREAM_CATCHER_PATHS = ['fast', 'discovery'] as const
export type DreamCatcherPath = (typeof DREAM_CATCHER_PATHS)[number]

/** Core themes for the fast path — enough to draft a Life Plan without the long walk. */
export const FAST_INTAKE_THEMES = [
  'priorities',
  'future_vision',
  'blockers',
  'focus_areas',
  'quantifiable_goals',
  'projects',
  'habits',
  'final_context',
] as const

export function normalizeDreamCatcherPath(path: unknown): DreamCatcherPath | null {
  if (path === 'fast' || path === 'discovery') return path
  return null
}

export function getIntakeCap(path: DreamCatcherPath): number {
  return path === 'fast'
    ? DREAM_CATCHER_LIMITS.intakeQuestionsFast
    : DREAM_CATCHER_LIMITS.intakeQuestions
}

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

export function getIntakeQuestionTheme(
  index: number,
  path: DreamCatcherPath = 'discovery'
): string {
  const themes = path === 'fast' ? FAST_INTAKE_THEMES : INTAKE_QUESTION_THEMES
  return themes[Math.min(Math.max(index, 0), themes.length - 1)]
}

/** About half of discovery questions are journalistic story beats; the rest are concrete follow-through. */
export const DISCOVERY_STORY_THEMES = [
  'priorities',
  'future_vision',
  'blockers',
  'focus_areas',
  'projects',
  'habits',
  'ruminations',
  'coping',
  'gratitude_items',
  'key_relationships',
] as const

/** Half of the fast path — a short scene, not a label. */
export const FAST_STORY_THEMES = ['priorities', 'future_vision', 'blockers', 'focus_areas'] as const

export function isStoryIntakeTheme(theme: string, path: DreamCatcherPath): boolean {
  const set = path === 'fast' ? FAST_STORY_THEMES : DISCOVERY_STORY_THEMES
  return (set as readonly string[]).includes(theme)
}

/** Journalistic story prompts — scenes and moments, not self-summary. */
const STORY_QUESTION_EXAMPLES: Partial<Record<(typeof INTAKE_QUESTION_THEMES)[number], string>> = {
  priorities:
    'Tell me about a recent day or week that felt like you. What happened, who was there, what did you actually spend yourself on?',
  future_vision:
    'Walk me through a Tuesday a year from now that went well — where are you, what did you just do, who is in the room?',
  blockers:
    'Tell me about a time that thing got in the way. What were you trying to do, and what actually happened?',
  focus_areas:
    'Describe a scene you want more of a year from now. Not the category — the room, the hour, the people.',
  projects:
    'Tell me about a time you tried to move something important. What did you start, and how did it go?',
  habits: 'Walk me through a morning or evening that worked. What did you actually do, in order?',
  ruminations: 'When that loop showed up recently, what was the scene? What was it telling you?',
  coping: 'Tell me about a time you got unstuck. What did you do, and what shifted?',
  gratitude_items:
    'Tell me about a recent moment you were actually grateful — where were you, what was happening?',
  key_relationships:
    'Who would you call after a hard day? Tell me a small story about them — a moment, not a title.',
}

export function getIntakeQuestionExample(theme: string, path: DreamCatcherPath): string {
  if (isStoryIntakeTheme(theme, path)) {
    const story = STORY_QUESTION_EXAMPLES[theme as (typeof INTAKE_QUESTION_THEMES)[number]]
    if (story) return story
  }
  const i = INTAKE_QUESTION_THEMES.indexOf(theme as (typeof INTAKE_QUESTION_THEMES)[number])
  return INTAKE_QUESTION_EXAMPLES[i] ?? INTAKE_QUESTION_EXAMPLES[0]
}

export function getIntakeQuestionContext(
  intakeQuestionIndex: number,
  currentPhase: string,
  path: DreamCatcherPath = 'discovery'
): string {
  if (normalizeDreamCatcherPhase(currentPhase) !== 'intake') return ''
  const cap = getIntakeCap(path)
  const q = Math.min(Math.max(intakeQuestionIndex, 0), cap - 1)
  const theme = getIntakeQuestionTheme(q, path)
  const storyBeat = isStoryIntakeTheme(theme, path)
  const beat = storyBeat ? 'STORY BEAT (journalistic)' : 'FACT BEAT'
  if (path === 'fast') {
    return `PATH: fast. ${beat}. THEME (internal only): ${theme} [${q + 1}/${cap}]. Never tell the user this index or duration. ${storyBeat ? 'Ask for a short scene; infer labels yourself.' : 'Keep it concrete and brief.'} Combine remaining themes when answers are rich. Finish at or before ${cap} as soon as you can draft a Life Plan.`
  }
  return `PATH: discovery. ${beat}. THEME (internal only): ${theme} [${q + 1}/${cap}]. Never tell the user this index or duration. ${storyBeat ? 'Invite a specific story/scene (who, where, what happened). Do NOT ask them to name their priorities, goals, or labels — you infer those from the story.' : 'You may be more direct, but still ground it in their week — not a personality quiz.'} Skip only if the theme is already clearly answered. Cap at ${cap}.`
}

export function getStreamlinedPhaseInstructions(
  currentPhase: string,
  intakeQuestionIndex: number,
  path: DreamCatcherPath = 'discovery'
): string {
  const phase = normalizeDreamCatcherPhase(currentPhase)

  if (phase === 'intake') {
    const cap = getIntakeCap(path)
    const q = Math.min(Math.max(intakeQuestionIndex, 0), cap - 1)
    const theme = getIntakeQuestionTheme(q, path)
    const example = getIntakeQuestionExample(theme, path)
    const storyBeat = isStoryIntakeTheme(theme, path)
    const pathRules =
      path === 'fast'
        ? `This is the FAST path. One short beat per turn. About half the beats are mini-scenes (story); the rest are concrete. Tap-chip replies are complete answers. Combine leftover themes when you can. Move to vision as soon as you can draft 2–4 goals, a few projects, and first steps — at most ${cap} questions.`
        : `This is the DISCOVERY path. About 50% of questions are STORY BEATS (journalistic): ask for a scene, memory, or what happened — not their objective conclusions. The other half may be more direct. Draw the Life Plan from their narrative. Cover themes more fully; skip only if already clearly answered. Cap at ${cap}.`

    const storyRules = storyBeat
      ? `
THIS QUESTION IS A STORY BEAT (journalistic):
- Ask for a specific moment: who, where, what happened, how it felt.
- Do NOT ask them to list priorities, goals, traits, or categories. You will infer those.
- If they only give a label ("health", "career") or a setting with no story, do NOT increment intake_question_index — ask what happened in a recent scene.
- After a real story, extract structured data from what occurred (goals, blockers, people, habits, projects) using their words in descriptions.
`
      : `
THIS QUESTION IS A FACT BEAT: you may be more direct (numbers, cadence, timeline) but still ground it in their week, not a quiz.
`

    return `
You are in the INTAKE phase. Ask exactly ONE question — warm, conversational, never a list of questions.

${pathRules}
${storyRules}

PACE: Keep each assistant message under 3 short sentences (discovery may use one extra sentence to invite a story). Acknowledge in a few words, then ask the next question. NEVER mention question numbers, remaining questions, totals, or how long this will take. Treat tap-chip replies and "Skip this one" as complete answers — do not re-ask.

Internal theme: ${theme} [${q + 1}/${cap}]. Use the theme as a guide and adapt based on what the user already shared.

Example question for this theme (adapt, do not copy verbatim if redundant):
"${example}"

After the user answers:
- Acknowledge briefly (a few words, not a recap).
- Extract ONLY NEW structured data into assessment_data (see extraction map). Infer conclusions from stories — do not wait for them to name the takeaway. Do NOT re-send entire arrays — only items learned from this answer.
- Keep draft goals to at most ${DREAM_CATCHER_LIMITS.goals.max} entries total during intake.
- Increment intake_question_index by 1 (or jump ahead if you skipped themes). On a STORY BEAT, only increment if you got an actual scene/story (or they skipped).
- If more is needed and ${q + 1} < ${cap}, ask the next natural question (next theme: ${getIntakeQuestionTheme(Math.min(q + 1, cap - 1), path)}).
- As soon as you have enough for a Life Plan — or after question ${cap} — give a 1-sentence recap and transition to vision (set next_phase to "vision").

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

Do NOT ask about executive skills inventories or long personality tests. Cap intake at ${cap} questions; finish sooner on the fast path.
`
  }

  if (phase === 'vision') {
    return `
You are in the VISION phase. Paint a vivid vision_statement (2-3 present-tense sentences) from the stories collected in intake — write it as if you were reporting who they are becoming, not repeating a slogan they never said.

A painted canvas on screen shows the full vision. Keep the chat short — invite them to sit with it, edit it, or tell you what to change. Never mention remaining steps or duration.

Stay on next_phase "vision" until the user clearly keeps/accepts the vision (e.g. "keep this vision", "that's the vibe", "yes"). If they ask to rewrite (bolder, softer, more personal, or their own edit), update vision_statement and remain on vision. Do NOT move to goals until they accept.
`
  }

  if (phase === 'goals') {
    return `
You are in the GOALS phase. Finalize ONLY the ${DREAM_CATCHER_LIMITS.goals.min}-${DREAM_CATCHER_LIMITS.goals.max} dashboard goals — do not finalize projects or tasks yet.

Infer the goals from the stories they told. Descriptions should sound like their scenes, not slogans they never said. Do not make them pick "top goals" if the narrative already shows them.

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

/** Scene-starters for story beats — openings, not conclusions. */
const STORY_REPLY_CHIPS: Partial<Record<IntakeTheme, ReplyChip[]>> = {
  priorities: chips(
    [
      'A work week',
      'Let me tell you about a recent work week: I was deep in it, late, proud and tired.',
    ],
    [
      'A night at home',
      'Let me tell you about a night at home: the people I care about were there, and that’s where my attention went.',
    ],
    [
      'A health stretch',
      'Let me tell you about a recent stretch with my body and energy — that’s what the week was really about.',
    ]
  ),
  future_vision: chips(
    [
      'A free Tuesday',
      'A year from now, picture a Tuesday: I finish meaningful work by afternoon and the evening is mine.',
    ],
    [
      'A table full of people',
      'A year from now: a table full of people I love, and I am not rushing away from it.',
    ],
    [
      'A strong morning',
      'A year from now I wake up already in motion — body good, mind clear, the day feels like mine.',
    ]
  ),
  blockers: chips(
    [
      'A stalled afternoon',
      'There was an afternoon I meant to move something important and I just… didn’t. Time and doubt ate it.',
    ],
    [
      'A drained week',
      'There was a week I had the plan and no energy left. That’s what got in the way.',
    ],
    [
      'A money pause',
      'There was a moment I stopped because of money — I could see the next step and couldn’t take it.',
    ]
  ),
  focus_areas: chips(
    [
      'The work scene',
      'The scene I want more of is me doing work that actually matters, without the scramble.',
    ],
    ['The home scene', 'The scene I want more of is being present at home — not half in my inbox.'],
    [
      'The body scene',
      'The scene I want more of is feeling strong in my body on an ordinary morning.',
    ]
  ),
  projects: chips(
    [
      'I started something',
      'I started something that mattered — here’s how it went, messy but real.',
    ],
    ['It stalled', 'I tried to move a project and it stalled. I’ll tell you what I actually did.'],
    [
      'Not sure yet',
      'I don’t have a project story yet — help me pull one from what I already said.',
    ]
  ),
  habits: chips(
    [
      'A morning that worked',
      'I’ll walk you through a morning that worked — what I actually did, in order.',
    ],
    [
      'An evening that worked',
      'I’ll walk you through an evening that worked — wind-down, not a perfect routine.',
    ],
    [
      'Still chaotic',
      'Most days are still chaotic. I’ll tell you the one thing that sometimes sticks.',
    ]
  ),
  ruminations: chips(
    [
      'A work loop',
      'The other night the work loop started — I’ll tell you the scene and what it kept saying.',
    ],
    ['A 3am worry', 'There was a 3am worry. I’ll tell you what it was about and how it showed up.'],
    [
      'Not much lately',
      'I don’t have a strong loop lately. Skip the story — nothing loud right now.',
    ]
  ),
  coping: chips(
    ['A walk that helped', 'I got unstuck by going for a walk. I’ll tell you what shifted.'],
    ['I talked it out', 'I got unstuck by talking it out with someone. Here’s how that went.'],
    ['I wrote it down', 'I got unstuck by writing it down. I’ll tell you what I actually did.']
  ),
  gratitude_items: chips(
    ['A person in the room', 'A recent grateful moment: a person was in the room and I noticed.'],
    [
      'A small ordinary thing',
      'A recent grateful moment was small and ordinary — I’ll tell you where I was.',
    ],
    ['My body showed up', 'A recent grateful moment was my body actually showing up for me.']
  ),
  key_relationships: chips(
    [
      'I’d call this person',
      'After a hard day I’d call this person. Here’s a small moment that shows why.',
    ],
    ['Family scene', 'There’s a family moment that shows who matters — I’ll tell you that scene.'],
    ['A friend who gets it', 'There’s a friend who gets it. Here’s a small story about them.']
  ),
}

export function isVisionAcceptance(message: string): boolean {
  const t = message.trim().toLowerCase()
  return (
    t.includes('keep this vision') ||
    t.includes('that vision matches') ||
    t.includes("that's the vibe") ||
    t.includes('thats the vibe') ||
    t.includes('this is my vision')
  )
}

const PHASE_REPLY_CHIPS: Partial<Record<StreamlinedPhase, ReplyChip[]>> = {
  vision: [
    {
      label: 'Keep this vision',
      value: 'Yes — keep this vision. Let’s shape the goals from it.',
    },
    {
      label: 'Make it bolder',
      value:
        'Rewrite the vision so it is bolder and more specific. Stay on the vision — do not move to goals yet.',
    },
    {
      label: 'Softer',
      value:
        'Rewrite the vision so it feels warmer and more grounded. Stay on the vision — do not move to goals yet.',
    },
    {
      label: 'More personal',
      value:
        'Rewrite the vision in my own voice, more personal and present-tense. Stay on the vision — do not move to goals yet.',
    },
  ],
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

export function getJourneyBeatLabel(
  phase: string,
  intakeQuestionIndex: number,
  path: DreamCatcherPath = 'discovery'
): string {
  const n = normalizeDreamCatcherPhase(phase)
  if (n === 'intake') {
    if (path === 'fast') {
      return intakeQuestionIndex <= 3 ? 'Fast catch' : 'Almost ready to sketch'
    }
    if (intakeQuestionIndex <= 5) return 'Catching the dream'
    if (intakeQuestionIndex <= 12) return 'Getting specific'
    return 'Almost ready to sketch'
  }
  if (n === 'vision') return 'Paint your vision'
  if (n === 'goals') return 'Naming your goals'
  if (n === 'projects') return 'Choosing projects'
  if (n === 'tasks') return 'Laying out first steps'
  if (n === 'summary') return 'Your Life Plan'
  return 'Lock it in'
}

/** Tappable one-beat answers for the current question. Empty in confirm. */
export function getReplyChips(
  phase: string,
  intakeQuestionIndex: number,
  path: DreamCatcherPath = 'discovery'
): ReplyChip[] {
  const n = normalizeDreamCatcherPhase(phase)
  if (n === 'intake') {
    const theme = getIntakeQuestionTheme(intakeQuestionIndex, path) as IntakeTheme
    if (isStoryIntakeTheme(theme, path)) {
      return STORY_REPLY_CHIPS[theme] ?? INTAKE_REPLY_CHIPS[theme] ?? chips()
    }
    return INTAKE_REPLY_CHIPS[theme] ?? chips()
  }
  return PHASE_REPLY_CHIPS[n as StreamlinedPhase] ?? []
}
