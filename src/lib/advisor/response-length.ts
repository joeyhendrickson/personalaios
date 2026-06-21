export const ADVISOR_INITIAL_MAX_CHARS = 1000
export const ADVISOR_FACTUAL_MAX_CHARS = 320

const FACTUAL_QUESTION_PHRASES = [
  'how much',
  'how many',
  'what was',
  'what were',
  'what is my',
  'what are my',
  'did i',
  'when did',
  'how long',
  'how did',
  'tell me what happened',
  'last night',
  'yesterday',
  'this week',
  'this month',
  'today',
  'cuánto',
  'cuántos',
  'cuanta',
  'cuantas',
  'qué fue',
  'que fue',
  'anoche',
  'ayer',
]

const MORE_DETAIL_PHRASES = [
  'more detail',
  'more details',
  'tell me more',
  'go on',
  'keep going',
  'continue',
  'expand',
  'elaborate',
  'more info',
  'more information',
  'yes please',
  'más detalle',
  'mas detalle',
  'más detalles',
  'mas detalles',
  'cuéntame más',
  'cuentame mas',
  'amplía',
  'amplia',
]

const MORE_DETAIL_QUESTION_EN = /would you like more detail\?/i
const MORE_DETAIL_QUESTION_ES = /¿te gustaría más detalle\?/i

type ChatMessage = { role: string; content: string }

export function assistantAskedForMoreDetail(content: string): boolean {
  return MORE_DETAIL_QUESTION_EN.test(content) || MORE_DETAIL_QUESTION_ES.test(content)
}

/** Objective lookup questions (sleep, spending, counts) — answer briefly when data exists. */
export function isFactualDataQuestion(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (normalized.length < 8) return false
  return FACTUAL_QUESTION_PHRASES.some((phrase) => normalized.includes(phrase))
}

/** User is continuing after a brief reply and wants the fuller version. */
export function userWantsMoreDetail(messages: ChatMessage[]): boolean {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  if (!lastUser?.content?.trim()) return false

  const text = lastUser.content.toLowerCase().trim()

  if (MORE_DETAIL_PHRASES.some((phrase) => text.includes(phrase))) {
    return true
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  if (!lastAssistant || !assistantAskedForMoreDetail(lastAssistant.content)) {
    return false
  }

  return /^(yes|yeah|yep|sure|please|ok|okay|y|sí|si)$/i.test(text)
}

export function buildAdvisorLengthInstructions(
  language: string,
  wantsMoreDetail: boolean,
  factualQuestion = false
): string {
  if (wantsMoreDetail) {
    return language === 'es'
      ? `LONGITUD DE RESPUESTA (modo detallado):
- El usuario pidió más detalle. Responde con una explicación más completa sin el límite de ~${ADVISOR_INITIAL_MAX_CHARS} caracteres.
- Mantén el enfoque: profundiza en lo que ya mencionaste, no repitas todo desde cero.
- No termines con "¿Te gustaría más detalle?" salvo que quede un tercer nivel claramente útil y aún no cubierto.`
      : `RESPONSE LENGTH (detail mode):
- The user asked for more detail. Give a fuller follow-up without the ~${ADVISOR_INITIAL_MAX_CHARS}-character limit.
- Stay focused: expand on what you already said; do not restart from scratch.
- Do not end with "Would you like more detail?" unless a clearly useful third level remains uncovered.`
  }

  if (factualQuestion) {
    return language === 'es'
      ? `LONGITUD DE RESPUESTA (modo factual — predeterminado para esta pregunta):
- El usuario hace una pregunta objetiva. Si MODULE CONTEXT o DASHBOARD STATE responden con alta confianza, responde en ${ADVISOR_FACTUAL_MAX_CHARS} caracteres o menos (1–3 oraciones).
- Empieza con el dato concreto (número, fecha, estado). No especules ni mezcles otros módulos salvo que el usuario pida causas o un plan.
- No pidas al usuario registrar datos que ya aparecen en MODULE CONTEXT.
- Si realmente falta el dato tras revisar los módulos instalados, dilo en una frase y opcionalmente indica dónde registrarlo.
- No propongas tarjetas del dashboard ni listas largas de seguimiento salvo que lo pidan.
- Si omites contexto útil por brevedad, termina con: "¿Te gustaría más detalle?"`
      : `RESPONSE LENGTH (factual mode — default for this question):
- The user asked an objective question. If MODULE CONTEXT or DASHBOARD STATE answer it with high confidence, reply in ${ADVISOR_FACTUAL_MAX_CHARS} characters or less (1–3 sentences).
- Lead with the concrete fact (number, date, status). Do not speculate or pull unrelated modules unless they asked for causes or a plan.
- Do not ask the user to log data that already appears in MODULE CONTEXT.
- If data is truly missing after checking installed modules, say so in one sentence and optionally point to where to add it.
- Do not offer dashboard proposal cards or long follow-up questionnaires unless they asked.
- If you omit useful context for brevity, end with: "Would you like more detail?"`
  }

  return language === 'es'
    ? `LONGITUD DE RESPUESTA (modo breve — predeterminado):
- Limita cada respuesta a unos ${ADVISOR_INITIAL_MAX_CHARS} caracteres o menos (aprox. 150–180 palabras).
- Prioriza lo más personalizado y accionable primero.
- Si normalmente darías más información útil pero la omites por este límite, termina exactamente con: "¿Te gustaría más detalle?"
- No uses esa pregunta si ya respondiste por completo dentro del límite.
- Si el usuario acepta, pasa al modo detallado en el siguiente turno.`
    : `RESPONSE LENGTH (brief mode — default):
- Keep each reply to about ${ADVISOR_INITIAL_MAX_CHARS} characters or less (roughly 150–180 words).
- Prioritize the most personalized, actionable points first.
- If you would normally include additional helpful detail but omit it because of this limit, end with exactly: "Would you like more detail?"
- Do not add that question if your answer already fully addresses the request within the limit.
- When the user accepts, switch to detail mode on the next turn.`
}

/** ~4 chars per token — rough cap for initial advisor replies. */
export function advisorMaxOutputTokens(
  wantsMoreDetail: boolean,
  factualQuestion = false
): number | undefined {
  if (wantsMoreDetail) return undefined
  if (factualQuestion) return 120
  return 280
}
