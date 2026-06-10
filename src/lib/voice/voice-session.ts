/** Pause after user stops speaking before auto-sending to chat */
export const VOICE_SESSION_SILENCE_MS = 3000

/** Delay before reopening mic after assistant audio finishes (reduces echo pickup) */
export const VOICE_SESSION_RESUME_DELAY_MS = 450

export function stopAllChatAudio(): void {
  if (typeof window === 'undefined') return
  const currentAudio = (window as Window & { __currentChatAudio?: HTMLAudioElement })
    .__currentChatAudio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    ;(window as Window & { __currentChatAudio?: HTMLAudioElement }).__currentChatAudio = undefined
  }
  window.speechSynthesis?.cancel()
}
