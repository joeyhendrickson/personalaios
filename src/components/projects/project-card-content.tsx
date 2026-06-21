'use client'

import type { ReactNode } from 'react'
import { getProjectCategoryEmoji } from '@/lib/projects/category-emoji'
import { ExpandableDescription } from '@/components/ui/expandable-description'

type ProjectCardContentProps = {
  category: string
  title: string
  description: string
  dragHandle?: ReactNode
  trailingActions?: ReactNode
  badges?: ReactNode
  expanded?: boolean
  onToggleExpand?: () => void
  viewDetailsLabel?: string
}

export function ProjectCardContent({
  category,
  title,
  description,
  dragHandle,
  trailingActions,
  badges,
  expanded = false,
  onToggleExpand,
  viewDetailsLabel = 'View details',
}: ProjectCardContentProps) {
  return (
    <div className="mb-4 w-full min-w-0">
      <div
        className={`grid w-full gap-x-3 gap-y-2 ${
          dragHandle ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'
        }`}
      >
        {dragHandle ? <div className="row-span-3 self-start pt-0.5">{dragHandle}</div> : null}

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="shrink-0 text-2xl leading-none" aria-hidden>
              {getProjectCategoryEmoji(category)}
            </span>
            <h3 className="min-w-0 flex-1 break-words font-semibold leading-snug text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
          {trailingActions ? (
            <div className="flex shrink-0 items-center justify-end gap-2 sm:self-start">
              {trailingActions}
            </div>
          ) : null}
        </div>

        {badges ? <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div> : null}

        <ExpandableDescription
          description={description}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          viewDetailsLabel={viewDetailsLabel}
        />
      </div>
    </div>
  )
}
