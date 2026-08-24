'use client'

import { Eye, Sparkles, Target } from 'lucide-react'
import type { PersonSummary } from '@/lib/dream-catcher/person-summary'

type PersonLifeSummaryProps = {
  summary: PersonSummary
  variant?: 'output' | 'saved' | 'welcome'
}

export function PersonLifeSummary({ summary, variant = 'output' }: PersonLifeSummaryProps) {
  const isWelcome = variant === 'welcome'
  const box = isWelcome
    ? 'rounded-xl border border-amber-200/80 bg-white/80 p-4'
    : 'rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-sm'

  return (
    <section aria-label="Who you are, your vision, and your goals" className={box}>
      <h3 className="mb-3 flex items-center text-base font-semibold text-amber-950">
        <Sparkles className="mr-2 h-4 w-4 text-amber-700" aria-hidden="true" />
        {isWelcome ? 'You in LifeStacks' : 'Who you are'}
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {summary.who_you_are}
      </p>

      {summary.vision.trim().length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 flex items-center text-sm font-semibold text-gray-900">
            <Eye className="mr-1.5 h-4 w-4 text-purple-600" aria-hidden="true" />
            Vision
          </h4>
          <p className="font-serif text-sm italic leading-relaxed text-amber-950">
            “{summary.vision}”
          </p>
        </div>
      )}

      {summary.goals.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 flex items-center text-sm font-semibold text-gray-900">
            <Target className="mr-1.5 h-4 w-4 text-emerald-700" aria-hidden="true" />
            Goals
          </h4>
          <ul className="space-y-1 text-sm text-gray-800">
            {summary.goals.map((goal) => (
              <li key={goal} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
