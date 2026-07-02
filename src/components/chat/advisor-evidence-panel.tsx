'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { AdvisorEvidence } from '@/types/advisor-evidence'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

type AdvisorEvidencePanelProps = {
  evidence: AdvisorEvidence | null
  isLoading: boolean
  onRecompute: (adjustmentText: string) => void
}

function confidenceColor(level: AdvisorEvidence['confidenceLevel']): string {
  if (level === 'high') return 'bg-emerald-100 text-emerald-900 border-emerald-200'
  if (level === 'medium') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-rose-100 text-rose-900 border-rose-200'
}

function ModuleCard({ module: mod }: { module: AdvisorEvidence['modules'][number] }) {
  const [open, setOpen] = useState(mod.includedInPrompt)

  return (
    <div
      className={`rounded-lg border p-3 ${mod.includedInPrompt ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50/80 opacity-80'}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left touch-manipulation"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{mod.label}</span>
            <span className="text-xs text-gray-500">Priority #{mod.priorityRank}</span>
            {mod.includedInPrompt ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                Used in reply
              </span>
            ) : (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                Available, not focused
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-600">
            {mod.recordCount} records · {mod.categories.slice(0, 2).join(', ') || 'general'}
          </p>
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-gray-200/80 pt-3 text-sm text-gray-800">
          {mod.objectiveFacts.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Facts considered
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {mod.objectiveFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
          {mod.recentHighlights.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Recent highlights
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {mod.recentHighlights.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {mod.subjectiveNotes.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Your notes
              </div>
              <ul className="list-disc space-y-1 pl-5">
                {mod.subjectiveNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          {mod.objectiveFacts.length === 0 &&
            mod.recentHighlights.length === 0 &&
            mod.subjectiveNotes.length === 0 && (
              <p className="text-gray-500">No detailed facts stored for this module yet.</p>
            )}
        </div>
      )}
    </div>
  )
}

export function AdvisorEvidencePanel({
  evidence,
  isLoading,
  onRecompute,
}: AdvisorEvidencePanelProps) {
  const [adjustment, setAdjustment] = useState('')

  if (!evidence) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-gray-500">
        <p>Send a message in Chat first. Evidence for the latest reply will appear here.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Model confidence
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium capitalize ${confidenceColor(evidence.confidenceLevel)}`}
          >
            {evidence.confidenceLevel} · {evidence.confidenceScore}%
          </div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {evidence.confidenceRationale.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Routing logic
          </div>
          <p className="text-sm text-gray-800">{evidence.routingSummary}</p>
          {evidence.detectedTopics.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              Topics: {evidence.detectedTopics.join(', ')}
            </p>
          )}
          {evidence.moduleOrder.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              Module order: {evidence.moduleOrder.join(' → ')}
            </p>
          )}
          {evidence.appliedAdjustments && evidence.appliedAdjustments.length > 0 && (
            <div className="mt-2 rounded-md border border-violet-200 bg-violet-50 p-2 text-xs text-violet-900">
              {evidence.appliedAdjustments.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Module evidence
          </div>
          <div className="space-y-2">
            {evidence.modules.map((mod) => (
              <ModuleCard key={mod.moduleId} module={mod} />
            ))}
          </div>
        </section>
      </div>

      <div className="shrink-0 border-t bg-gray-50 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Adjust logic &amp; recompute
        </div>
        <p className="mb-2 text-xs text-gray-600">
          Tell the Advisor how to re-weight your data, then recompute the last answer. Example:
          &quot;Prioritize my health over my finances today, and recompute your response.&quot;
        </p>
        <Textarea
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          placeholder="Prioritize my health over my finances today, and recompute your response."
          className="mb-2 min-h-[80px] text-sm"
          disabled={isLoading}
        />
        <Button
          type="button"
          className="w-full touch-manipulation"
          disabled={isLoading || !adjustment.trim()}
          onClick={() => onRecompute(adjustment.trim())}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Recompute response
        </Button>
      </div>
    </div>
  )
}
