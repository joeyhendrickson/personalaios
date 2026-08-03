import 'server-only'

import { generateText } from 'ai'
import { defaultOpenaiModel } from '@/lib/ai/default-openai-model'
import { resolveOpenAIModelId } from '@/lib/ai/openai-model-id'
import { logAIUsage, normalizeUsageFromVercelAI } from '@/lib/ai/usage-logger'
import type {
  FocusReview,
  ProgressReportDocument,
  ReportPeriodType,
  ReportSwot,
  UserProfileInsight,
} from './types'
import type { RawReportContext } from './collect-data'
import type { Language } from '@/contexts/language-context'
import { spanishResponseInstruction } from '@/lib/i18n/language-prompt'

export type GeneratedReportContent = Pick<
  ProgressReportDocument,
  | 'narrativeSummary'
  | 'highlightsBullets'
  | 'coverArtPrompt'
  | 'moduleHighlights'
  | 'userProfile'
  | 'focusReview'
  | 'swot'
>

const EMPTY_PROFILES: Record<
  Language,
  { userProfile: UserProfileInsight; focusReview: FocusReview; narrative: string }
> = {
  en: {
    userProfile: {
      whoYouSeemToBe: 'You are someone building momentum across your goals and daily systems.',
      apparentFocus:
        'Your attention is spread across the areas reflected in your completed work this period.',
      motivationDrivers: ['Consistency in daily habits', 'Progress on meaningful tasks'],
    },
    focusReview: {
      summary: 'This period reflects where you chose to invest your time and energy.',
      tasksFocus: [],
      projectsFocus: [],
      goalsFocus: [],
    },
    narrative: 'You made meaningful progress this period. Keep building on your momentum.',
  },
  es: {
    userProfile: {
      whoYouSeemToBe: 'Eres alguien que está construyendo impulso en tus metas y sistemas diarios.',
      apparentFocus:
        'Tu atención se distribuye en las áreas reflejadas en tu trabajo completado este período.',
      motivationDrivers: ['Constancia en hábitos diarios', 'Progreso en tareas significativas'],
    },
    focusReview: {
      summary: 'Este período refleja dónde elegiste invertir tu tiempo y energía.',
      tasksFocus: [],
      projectsFocus: [],
      goalsFocus: [],
    },
    narrative: 'Lograste un progreso significativo en este período. Sigue construyendo tu impulso.',
  },
}

const EMPTY_SWOT: ReportSwot = {
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
}

export async function generateReportContent(
  userId: string,
  periodType: ReportPeriodType,
  periodLabel: string,
  periodStart: string,
  periodEnd: string,
  context: RawReportContext,
  language: Language = 'en'
): Promise<GeneratedReportContent> {
  const fallbacks = EMPTY_PROFILES[language]
  const prompt = `You are writing a personal progress plan / report for a Life Stacks user. Ground every claim in the data below—do not invent facts.

PERIOD: ${periodLabel} (${periodType})
DATES: ${periodStart} through ${periodEnd}

DATA:
${JSON.stringify(
  {
    stats: context.stats,
    focusEvidence: context.focusEvidence,
    moduleHighlights: context.moduleHighlights,
    accomplishments: context.accomplishments,
  },
  null,
  2
)}

Write JSON only:
{
  "userProfile": {
    "whoYouSeemToBe": "2-3 sentences: personality/working style inferred from categories, habits, modules used, and completion patterns. Second person. Observational, respectful.",
    "apparentFocus": "2-3 sentences: what life domains or themes they seem oriented toward this period (career, health, relationships, money, growth, etc.) based on tasks, projects, goals, categories.",
    "motivationDrivers": ["4-6 bullets: what appears to drive them—infer especially from habits completed (which habits, how often), points earned, and repeated categories. Name specific habits/tasks when data exists."]
  },
  "focusReview": {
    "summary": "2-3 paragraphs: honest review of what they ACTUALLY focused on this period—weighted by completed tasks, project progress/completions, and goal movement. Contrast creation vs completion if relevant. Second person.",
    "tasksFocus": ["bullets naming specific completed tasks/themes from data; note top categories"],
    "projectsFocus": ["bullets on project titles, % progress, completions in period"],
    "goalsFocus": ["bullets on high-level goals and progress %"]
  },
  "swot": {
    "strengths": ["4-6 internal positives evidenced by data—e.g. habit streaks, follow-through, category strengths"],
    "weaknesses": ["3-5 internal gaps—e.g. many pending tasks, stalled projects, uneven categories—only if data supports"],
    "opportunities": ["4-6 external or situational openings—e.g. modules unused, goals nearing completion, categories to lean into"],
    "threats": ["3-5 risks—e.g. spread too thin, neglected areas, burnout patterns from volume—tied to data, not alarmist"]
  },
  "narrativeSummary": "1-2 paragraph executive summary tying profile, focus, and SWOT into an encouraging forward-looking close.",
  "highlightsBullets": ["5-8 short win bullets"],
  "coverArtPrompt": "DALL-E prompt (max 900 chars): elegant magazine cover, abstract growth motifs, cohesive palette, NO text in image",
  "moduleHighlights": [{ "moduleId", "moduleLabel", "usageCount", "conclusions": ["refined takeaways"] }]
}

Rules:
- Habits: use focusEvidence.habits and stats.habitCompletions heavily for motivationDrivers.
- Tasks/projects/goals: cite real titles from focusEvidence when possible.
- SWOT must be balanced; if data is thin, say so gently and keep lists shorter.
- Do not fabricate therapy/clinical diagnoses.
- moduleHighlights: refine input modules only; do not invent module usage.

${spanishResponseInstruction(language)}`

  const started = Date.now()
  const result = await generateText({
    model: defaultOpenaiModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.55,
  })

  await logAIUsage({
    userId,
    module: 'progress-reports',
    action: 'generate_narrative',
    route: '/api/progress-reports/generate',
    model: resolveOpenAIModelId(),
    ...normalizeUsageFromVercelAI(result),
    latencyMs: Date.now() - started,
    description: `Progress report plan (${periodType})`,
  })

  let parsed: Partial<GeneratedReportContent> = {}

  try {
    parsed = JSON.parse(result.text)
  } catch {
    const match = result.text.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  }

  const mergedHighlights =
    parsed.moduleHighlights && parsed.moduleHighlights.length > 0
      ? parsed.moduleHighlights
      : context.moduleHighlights

  const userProfile: UserProfileInsight = {
    whoYouSeemToBe:
      String(parsed.userProfile?.whoYouSeemToBe || '').trim() ||
      fallbacks.userProfile.whoYouSeemToBe,
    apparentFocus:
      String(parsed.userProfile?.apparentFocus || '').trim() || fallbacks.userProfile.apparentFocus,
    motivationDrivers: (parsed.userProfile?.motivationDrivers || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 8),
  }
  if (userProfile.motivationDrivers.length === 0) {
    userProfile.motivationDrivers = fallbacks.userProfile.motivationDrivers
  }

  const focusReview: FocusReview = {
    summary: String(parsed.focusReview?.summary || '').trim() || fallbacks.focusReview.summary,
    tasksFocus: (parsed.focusReview?.tasksFocus || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 12),
    projectsFocus: (parsed.focusReview?.projectsFocus || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 12),
    goalsFocus: (parsed.focusReview?.goalsFocus || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 12),
  }

  const swot: ReportSwot = {
    strengths: (parsed.swot?.strengths || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 8),
    weaknesses: (parsed.swot?.weaknesses || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 6),
    opportunities: (parsed.swot?.opportunities || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 8),
    threats: (parsed.swot?.threats || [])
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, 6),
  }

  return {
    userProfile,
    focusReview,
    swot,
    narrativeSummary: String(parsed.narrativeSummary || '').trim() || fallbacks.narrative,
    highlightsBullets: (parsed.highlightsBullets || [])
      .map((b) => String(b).trim())
      .filter(Boolean)
      .slice(0, 10),
    coverArtPrompt:
      String(parsed.coverArtPrompt || '').trim() ||
      'Elegant abstract magazine cover art celebrating personal growth, soft gradients, gold and blue tones, minimalist, no text, professional report aesthetic',
    moduleHighlights: mergedHighlights,
  }
}
