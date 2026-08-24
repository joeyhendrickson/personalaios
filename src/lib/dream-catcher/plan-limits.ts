/** Hard caps for Dream Catcher starter dashboard generation. */
export const DREAM_CATCHER_LIMITS = {
  /** Max intake questions on the discovery path before moving to vision. */
  intakeQuestions: 20,
  /** Max intake questions on the fast path. */
  intakeQuestionsFast: 8,
  /** Target intake duration guidance for prompts (minutes). */
  intakeMinutesMax: 15,
  goals: { min: 2, max: 4 },
  projects: { min: 3, max: 7 },
  tasks: { min: 4, max: 15 },
  habits: { max: 5 },
  education: { max: 3 },
  fitnessGoals: { max: 2 },
  ruminations: { max: 4 },
  relationships: { max: 3 },
  gratitudeItems: { max: 10 },
} as const

export function formatPlanLimitsForPrompt(): string {
  const L = DREAM_CATCHER_LIMITS
  return [
    `GOALS: ${L.goals.min}-${L.goals.max} measurable goals (descriptions must include metrics or milestones)`,
    `PROJECTS: ${L.projects.min}-${L.projects.max} milestone initiatives (NOT goal copies — smaller steps that add up to each goal)`,
    `TASKS: ${L.tasks.min}-${L.tasks.max} concrete tactics/steps (linked to projects — NOT goal or project copies)`,
    `HABITS: up to ${L.habits.max} daily habits that reinforce progress`,
  ].join('\n')
}
