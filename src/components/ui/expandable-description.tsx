'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'

const DEFAULT_TRUNCATE_LENGTH = 120

type ExpandableDescriptionProps = {
  description?: string | null
  expanded?: boolean
  onToggleExpand?: () => void
  viewDetailsLabel?: string
  truncateAt?: number
  className?: string
}

export function ExpandableDescription({
  description,
  expanded = false,
  onToggleExpand,
  viewDetailsLabel = 'View details',
  truncateAt = DEFAULT_TRUNCATE_LENGTH,
  className = '',
}: ExpandableDescriptionProps) {
  const text = (description || '').trim()
  if (!text) return null

  const shouldTruncate = text.length > truncateAt
  const displayDescription =
    shouldTruncate && !expanded ? `${text.substring(0, truncateAt).trim()}...` : text

  return (
    <div className={`min-w-0 w-full space-y-2 ${className}`.trim()}>
      <p className="w-full text-sm leading-relaxed text-gray-600 dark:text-white/75">
        {displayDescription}
      </p>
      {shouldTruncate && onToggleExpand ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-[hsl(43_80%_62%)] dark:hover:text-[hsl(43_76%_52%)]"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              {viewDetailsLabel}
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
