export type OpenAdvisorDetail = {
  startListening?: boolean
  initialMessage?: string
}

export const LIFESTACKS_OPEN_ADVISOR_EVENT = 'lifestacks-open-advisor'
export const LIFESTACKS_WAKE_WORD_PAUSE_EVENT = 'lifestacks-wake-word-pause'
export const LIFESTACKS_WAKE_WORD_RESUME_EVENT = 'lifestacks-wake-word-resume'

export function openLifestacksAdvisor(detail: OpenAdvisorDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LIFESTACKS_OPEN_ADVISOR_EVENT, { detail }))
}

export function pauseWakeWordListener(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFESTACKS_WAKE_WORD_PAUSE_EVENT))
}

export function resumeWakeWordListener(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(LIFESTACKS_WAKE_WORD_RESUME_EVENT))
}
