'use client'

import { GraduationCap, LayoutList, Repeat, Target, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  buildProposalDisplayModel,
  type DashboardSectionKey,
} from '@/lib/assistant/proposal-display'
import type { ActionProposalRow } from '@/lib/assistant/proposal-schemas'

export type DashboardProposalCardData = {
  id: string
  action_type: ActionProposalRow['action_type'] | string
  preview?: string
  payload?: Record<string, unknown>
}

type DashboardProposalCardProps = {
  proposal: DashboardProposalCardData
  disabled?: boolean
  onConfirm: (id: string) => void
  onSkip: (id: string) => void
}

const SECTION_STYLES: Record<
  DashboardSectionKey | 'completion',
  { badge: string; icon: typeof Target }
> = {
  goals: { badge: 'bg-red-100 text-red-800 border-red-200', icon: Target },
  projects: { badge: 'bg-green-100 text-green-800 border-green-200', icon: LayoutList },
  tasks: { badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckSquare },
  habits: { badge: 'bg-purple-100 text-purple-800 border-purple-200', icon: Repeat },
  education: { badge: 'bg-amber-100 text-amber-900 border-amber-200', icon: GraduationCap },
  completion: { badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', icon: CheckSquare },
}

function payloadFromPreview(
  actionType: string,
  preview?: string,
  payload?: Record<string, unknown>
): Record<string, unknown> {
  if (payload && Object.keys(payload).length > 0) return payload
  const titleMatch = preview?.match(/^(?:Goal|Project|Task|Habit):\s*(.+)/m)
  return titleMatch ? { title: titleMatch[1].trim() } : {}
}

export function DashboardProposalCard({
  proposal,
  disabled,
  onConfirm,
  onSkip,
}: DashboardProposalCardProps) {
  const payload = payloadFromPreview(proposal.action_type, proposal.preview, proposal.payload)
  const model = buildProposalDisplayModel(proposal.action_type, payload)
  const styleKey = model.isCompletion ? 'completion' : model.sectionKey
  const Icon = SECTION_STYLES[styleKey].icon

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 rounded-lg border p-2 ${SECTION_STYLES[styleKey].badge}`}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SECTION_STYLES[styleKey].badge}`}
            >
              {model.sectionTitle} section
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">{model.sectionHint}</p>
          <h4 className="text-sm font-semibold text-gray-900">{model.headline}</h4>
          {model.details.length > 0 && (
            <dl className="mt-2 space-y-1.5">
              {model.details.map((row) => (
                <div key={row.label} className="text-sm">
                  <dt className="inline font-medium text-gray-700 after:content-[':_']">
                    {row.label}
                  </dt>
                  <dd className="inline text-gray-600 whitespace-pre-wrap">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!model.details.length && proposal.preview && (
            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{proposal.preview}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={disabled}
          className="touch-manipulation"
          onClick={() => onConfirm(proposal.id)}
        >
          {model.confirmLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className="touch-manipulation"
          onClick={() => onSkip(proposal.id)}
        >
          Skip
        </Button>
      </div>
    </div>
  )
}
