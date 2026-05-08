import type {
  NarrativeIntegrationMessage,
  NarrativeIntegrationPhase,
  RuminationAnalysisResult,
  RuminationPattern,
  SafetyAssessment,
} from './types'

function clampInt(n: number, min: number, max: number) {
  const x = Math.round(n)
  return Math.max(min, Math.min(max, x))
}

function normalize(text: string) {
  return (text || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function countMatches(text: string, patterns: Array<RegExp>): number {
  let c = 0
  for (const p of patterns) {
    if (p.test(text)) c += 1
  }
  return c
}

export function assessSafety(input: string): SafetyAssessment {
  const t = normalize(input)

  const reasons: string[] = []

  const selfHarm = [
    /\b(i (want|plan|intend) to (kill myself|die|end it))\b/i,
    /\b(suicid(e|al))\b/i,
    /\b(self[-\s]?harm|cut myself|hurt myself)\b/i,
    /\b(overdose|od)\b/i,
  ]

  const psychosis = [/\b(hearing voices|voices telling me|hallucinat(e|ing)|paranoid)\b/i]

  const activeDanger = [
    /\b(i am in danger|someone is here|they are going to hurt me|i can’t leave)\b/i,
    /\b(being abused right now|violence right now|currently happening)\b/i,
  ]

  const panicDerealization = [
    /\b(i can’t breathe|panic attack|extreme panic|i’m freaking out)\b/i,
    /\b(derealization|depersonalization)\b/i,
    /\b(not real|nothing feels real|i’m not in my body)\b/i,
    /\b(can’t orient|can’t tell where i am|don’t know where i am)\b/i,
  ]

  const highRiskHits =
    countMatches(input, selfHarm) +
    countMatches(input, psychosis) +
    countMatches(input, activeDanger)
  const dissociationHits = countMatches(input, panicDerealization)

  if (highRiskHits > 0) {
    reasons.push('high_risk_signal')
    return {
      safety_status: 'high_risk',
      dissociation_indicators: dissociationHits > 0,
      reasons,
      disable_deep_processing: true,
    }
  }

  if (dissociationHits > 0) {
    reasons.push('dissociation_or_panic_signal')
    return {
      safety_status: 'needs_grounding',
      dissociation_indicators: true,
      reasons,
      disable_deep_processing: false,
    }
  }

  return {
    safety_status: 'ok',
    dissociation_indicators: false,
    reasons,
    disable_deep_processing: false,
  }
}

function similarity(a: string, b: string): number {
  const x = normalize(a)
  const y = normalize(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const ax = new Set(x.split(' '))
  const by = new Set(y.split(' '))
  let inter = 0
  for (const w of ax) if (by.has(w)) inter += 1
  const union = ax.size + by.size - inter
  return union === 0 ? 0 : inter / union
}

export function analyzeRuminationState(
  input: string,
  previousMessages: Array<Pick<NarrativeIntegrationMessage, 'role' | 'content'>> = []
): RuminationAnalysisResult {
  const t = normalize(input)

  const lastUserMessages = previousMessages.filter((m) => m.role === 'user').slice(-6)
  const repetition = lastUserMessages.some((m) => similarity(m.content, input) > 0.8)

  const loopingSignals = [
    /\b(why did this happen|it’s not fair|unfair)\b/i,
    /\b(keeps replaying|can’t stop thinking|stuck in my head|looping)\b/i,
    /\b(i’ll never (recover|get over it)|this ruined me|i’m ruined)\b/i,
    /\b(over and over|again and again)\b/i,
  ]

  const floodingSignals = [
    /\b(i can’t handle this|too much|overwhelmed)\b/i,
    /\b(i’m shaking|heart racing|can’t breathe)\b/i,
    /\b(panic|terrified|hysterical)\b/i,
  ]

  const avoidantSignals = [
    /\b(i don’t want to talk about it|can’t go there|not ready)\b/i,
    /\b(whatever|doesn’t matter|i don’t know)\b/i,
    /\b(let’s skip|change the subject)\b/i,
  ]

  const integratingSignals = [
    /\b(i learned|i realize|i understand now|i can see)\b/i,
    /\b(what i’m taking forward|the lesson is|moving forward)\b/i,
    /\b(i want to focus on|my next step)\b/i,
  ]

  const productiveSignals = [
    /\b(it meant|i felt|i needed|i wish i had)\b/i,
    /\b(the unresolved part is|what still feels unanswered)\b/i,
    /\b(the belief i formed|i concluded that)\b/i,
  ]

  let score = 4
  let pattern: RuminationPattern = 'productive_reflection'

  const floodingHits = countMatches(input, floodingSignals)
  const avoidantHits = countMatches(input, avoidantSignals)
  const loopingHits = countMatches(input, loopingSignals) + (repetition ? 1 : 0)
  const integratingHits = countMatches(input, integratingSignals)
  const productiveHits = countMatches(input, productiveSignals)

  if (floodingHits > 0) {
    pattern = 'flooding'
    score = 9
  } else if (avoidantHits > 0 && productiveHits === 0) {
    pattern = 'avoidant'
    score = 6
  } else if (loopingHits >= 2) {
    pattern = 'looping'
    score = 8
  } else if (integratingHits > 0) {
    pattern = 'integrating'
    score = 3
  } else if (loopingHits === 1 && productiveHits === 0) {
    pattern = 'looping'
    score = 7
  } else {
    pattern = 'productive_reflection'
    score = 4
  }

  const rumination_score = clampInt(score, 1, 10)

  const recommended_next_phase: NarrativeIntegrationPhase =
    pattern === 'flooding'
      ? 'stabilization'
      : pattern === 'avoidant'
        ? 'event_inventory'
        : pattern === 'looping'
          ? 'frozen_belief'
          : pattern === 'integrating'
            ? 'meaning_making'
            : 'narrative_clarification'

  return { rumination_score, pattern, recommended_next_phase }
}
