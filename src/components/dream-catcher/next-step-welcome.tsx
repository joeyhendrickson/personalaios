'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import {
  buildPersonSummary,
  parsePersonSummary,
  type PersonSummary,
} from '@/lib/dream-catcher/person-summary'
import { PersonLifeSummary } from '@/components/dream-catcher/person-life-summary'

export function NextStepWelcome({ onDismiss }: { onDismiss: () => void }) {
  const [summary, setSummary] = useState<PersonSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/modules/dream-catcher/saved')
        if (!res.ok) return
        const data = (await res.json()) as {
          sessions?: Array<{ assessment_data?: Record<string, unknown> }>
        }
        const raw = data.sessions?.[0]?.assessment_data
        if (!raw || cancelled) return
        setSummary(parsePersonSummary(raw) ?? buildPersonSummary(raw))
      } catch {
        // Banner still works without the stored summary.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-white to-sky-50">
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold text-amber-950">
              <CheckCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              You took the next step into LifeStacks
            </p>
            <p className="mt-1 text-sm text-gray-700">
              This is the person, vision, and goals Dream Catcher stored for you. Your dashboard is
              built from this summary.
            </p>
            {summary && (
              <div className="mt-4">
                <PersonLifeSummary summary={summary} variant="welcome" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-gray-500 hover:text-gray-800"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
