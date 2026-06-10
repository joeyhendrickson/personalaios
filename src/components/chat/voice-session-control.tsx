'use client'

import { Button } from '@/components/ui/button'
import { VoiceWaveform } from '@/components/chat/voice-waveform'
import { useLanguage } from '@/contexts/language-context'
import { Mic, X } from 'lucide-react'

export type VoiceSessionPhase = 'off' | 'listening' | 'processing' | 'speaking'

type VoiceSessionControlProps = {
  supported: boolean
  active: boolean
  phase: VoiceSessionPhase
  previewText?: string
  waveformLevels?: number[]
  disabled?: boolean
  onStart: () => void
  onEnd: () => void
  onInterrupt?: () => void
}

export function VoiceSessionControl({
  supported,
  active,
  phase,
  previewText,
  waveformLevels = [],
  disabled,
  onStart,
  onEnd,
  onInterrupt,
}: VoiceSessionControlProps) {
  const { t } = useLanguage()

  if (!supported) {
    return <p className="text-xs text-gray-500">{t('chat.voiceSession.unsupported')}</p>
  }

  if (!active) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onStart}
        className="h-10 w-full touch-manipulation border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100"
      >
        <Mic className="mr-2 h-4 w-4" />
        {t('chat.voiceSession.start')}
      </Button>
    )
  }

  const statusLabel =
    phase === 'speaking'
      ? t('chat.voiceSession.speaking')
      : phase === 'processing'
        ? t('chat.voiceSession.processing')
        : t('chat.voiceSession.listening')

  const canInterrupt = phase === 'speaking' && Boolean(onInterrupt)
  const waveformVariant =
    phase === 'speaking' ? 'speaking' : phase === 'processing' ? 'processing' : 'listening'

  const handleBarClick = () => {
    if (canInterrupt) onInterrupt?.()
  }

  return (
    <div
      role={canInterrupt ? 'button' : undefined}
      tabIndex={canInterrupt ? 0 : undefined}
      onClick={canInterrupt ? handleBarClick : undefined}
      onKeyDown={
        canInterrupt
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onInterrupt?.()
              }
            }
          : undefined
      }
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        phase === 'speaking' ? 'border-amber-200 bg-amber-50/95' : 'border-red-200 bg-red-50/90'
      } ${canInterrupt ? 'cursor-pointer hover:brightness-[0.98]' : ''}`}
    >
      <VoiceWaveform
        levels={
          waveformLevels.length > 0
            ? waveformLevels
            : Array(12).fill(phase === 'processing' ? 0.12 : 0.08)
        }
        active={phase === 'listening' || phase === 'speaking'}
        variant={waveformVariant}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-medium ${
            phase === 'speaking' ? 'text-amber-950' : 'text-red-900'
          }`}
        >
          {statusLabel}
        </p>
        {phase === 'listening' && previewText ? (
          <p className="truncate text-xs text-red-800/80">&ldquo;{previewText}&rdquo;</p>
        ) : phase === 'listening' ? (
          <p className="text-xs text-red-800/70">{t('chat.voiceSession.hint')}</p>
        ) : canInterrupt ? (
          <p className="text-xs text-amber-900/80">{t('chat.voiceSession.interruptHint')}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onEnd()
        }}
        aria-label={t('chat.voiceSession.stop')}
        className={`h-8 w-8 shrink-0 p-0 ${
          phase === 'speaking'
            ? 'text-amber-950 hover:bg-amber-100'
            : 'text-red-900 hover:bg-red-100'
        }`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
