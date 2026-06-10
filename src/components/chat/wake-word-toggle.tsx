'use client'

import { useLanguage } from '@/contexts/language-context'

type WakeWordToggleProps = {
  enabled: boolean
  supported: boolean
  onChange: (enabled: boolean) => void
  compact?: boolean
}

export function WakeWordToggle({ enabled, supported, onChange, compact }: WakeWordToggleProps) {
  const { t } = useLanguage()

  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none ${
        compact ? 'text-xs text-gray-600' : 'text-sm text-gray-700'
      } ${!supported ? 'opacity-60 cursor-not-allowed' : ''}`}
      title={supported ? t('chat.wakeWord.hint') : t('chat.wakeWord.unsupported')}
    >
      <input
        type="checkbox"
        checked={enabled}
        disabled={!supported}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-300 text-black focus:ring-black"
      />
      <span className={compact ? 'whitespace-nowrap' : ''}>{t('chat.wakeWord.label')}</span>
      {!compact && (
        <span className="text-xs text-gray-500 hidden sm:inline">
          {t('chat.wakeWord.hintShort')}
        </span>
      )}
    </label>
  )
}
