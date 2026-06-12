export const ADVISOR_INITIAL_MAX_CHARS = 1000

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

export function buildAdvisorLengthInstructions(language: string, wantsMoreDetail: boolean): string {
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
export function advisorMaxOutputTokens(wantsMoreDetail: boolean): number | undefined {
  return wantsMoreDetail ? undefined : 280
}
