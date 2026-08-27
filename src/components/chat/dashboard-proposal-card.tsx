'use client'

import { Check, X } from 'lucide-react'
import { buildProposalDisplayModel } from '@/lib/assistant/proposal-display'
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
  const label = model.isCompletion
    ? `Mark complete: ${model.headline}`
    : `Add to ${model.sectionTitle}: ${model.headline}`

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        title={label}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black bg-black text-white hover:bg-gray-800 disabled:opacity-50"
        onClick={() => onConfirm(proposal.id)}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{model.headline}</p>
        <p className="truncate text-xs text-gray-500">
          {model.isCompletion ? 'Mark complete' : `Add to ${model.sectionTitle}`}
        </p>
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-label="Dismiss"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        onClick={() => onSkip(proposal.id)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
