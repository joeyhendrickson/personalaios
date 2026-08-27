'use client'

import { useLanguage } from '@/contexts/language-context'
import { cn } from '@/lib/utils'

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      className={cn('flex items-center rounded-lg p-1', compact ? 'bg-white/10' : 'bg-gray-100')}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          'rounded-md font-medium transition-colors',
          compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
          language === 'en'
            ? 'bg-white text-gray-900 shadow-sm'
            : compact
              ? 'text-white/75 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('es')}
        className={cn(
          'rounded-md font-medium transition-colors',
          compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
          language === 'es'
            ? 'bg-white text-gray-900 shadow-sm'
            : compact
              ? 'text-white/75 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
        )}
      >
        ES
      </button>
    </div>
  )
}
