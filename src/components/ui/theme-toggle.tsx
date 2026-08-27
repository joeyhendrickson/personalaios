'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border transition-colors',
        compact
          ? 'h-8 w-8 border-white/20 bg-white/10 text-white hover:bg-white/15'
          : 'h-9 w-9 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gold dark:bg-black dark:text-gold dark:hover:bg-gold/10'
      )}
    >
      {isDark ? (
        <Sun className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      ) : (
        <Moon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      )}
    </button>
  )
}
