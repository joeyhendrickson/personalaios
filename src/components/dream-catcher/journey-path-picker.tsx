'use client'

import { Compass, Zap } from 'lucide-react'
import type { DreamCatcherPath } from '@/lib/dream-catcher/streamlined-phases'

type JourneyPathPickerProps = {
  onChoose: (path: DreamCatcherPath) => void
}

export function JourneyPathPicker({ onChoose }: JourneyPathPickerProps) {
  return (
    <section aria-label="Choose your Dream Catcher path" className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-amber-950">How do you want to catch this?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Same Life Plan at the end. Pick the walk that fits today.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose('fast')}
          className="group rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 text-left shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
        >
          <span className="inline-flex rounded-xl bg-amber-100 p-2 text-amber-800">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-amber-950">Fast catch</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            A few short beats — tap chips or type a line. Then we paint your vision and sketch the
            plan.
          </p>
          <span className="mt-4 inline-flex text-sm font-medium text-amber-800 group-hover:underline">
            Start the fast catch →
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoose('discovery')}
          className="group rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 text-left shadow-sm transition-all hover:border-sky-400 hover:shadow-md"
        >
          <span className="inline-flex rounded-xl bg-sky-100 p-2 text-sky-800">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-lg font-semibold text-sky-950">Discovery journey</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            A longer walk through who you are. Tell stories and scenes — we draw the plan from your
            narrative.
          </p>
          <span className="mt-4 inline-flex text-sm font-medium text-sky-800 group-hover:underline">
            Start the discovery journey →
          </span>
        </button>
      </div>
    </section>
  )
}
