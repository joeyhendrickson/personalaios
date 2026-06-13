/** Pause after user stops speaking before auto-sending to chat */
export const VOICE_SESSION_SILENCE_MS = 3000

/** Delay before reopening mic after assistant audio finishes (reduces echo pickup) */
export const VOICE_SESSION_RESUME_DELAY_MS = 450

/** Abort TTS fetch if the API is slow — avoids stale speech after sleep/tab backgrounding */
export const ADVISOR_TTS_FETCH_TIMEOUT_MS = 25_000

/** Cap TTS input so responses do not queue multi-minute audio jobs */
export const ADVISOR_TTS_MAX_CHARS = 2_500

export function stopAllChatAudio(): void {
  if (typeof window === 'undefined') return
  const currentAudio = (window as Window & { __currentChatAudio?: HTMLAudioElement })
    .__currentChatAudio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    ;(window as Window & { __currentChatAudio?: HTMLAudioElement }).__currentChatAudio = undefined
  }
  const synth = window.speechSynthesis
  if (synth) {
    synth.cancel()
    // Clear any queued browser utterances (can fire minutes later after wake from sleep)
    try {
      synth.resume()
      synth.cancel()
    } catch {
      /* ignore */
    }
  }
}
