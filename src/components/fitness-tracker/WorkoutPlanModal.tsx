'use client'

import { useMemo, useState } from 'react'
import {
  X,
  Calendar,
  Target,
  Zap,
  Utensils,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  adaptWeeklyStructure,
  energyModeFromScore,
  type WeeklyStructure,
} from '@/lib/fitness/adapt-workout-structure'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'

type WorkoutPlan = {
  id: string
  plan_name: string
  plan_type: string
  difficulty_level: string
  duration_weeks: number
  frequency_per_week: number
  target_areas: string[]
  goals_supported?: string[]
  description?: string
  weekly_structure?: WeeklyStructure
  progression_strategy?: Record<string, string>
}

type FitnessGoal = {
  goal_type: string
  target_areas: string[]
  timeline_weeks: number
  priority_level: string
  description?: string
}

type DashboardGoal = {
  title?: string
  description?: string
  priority_level?: number
  target_date?: string
}

type FitnessStat = {
  stat_type: string
  exercise_name: string
  measurement_value: number
  measurement_unit: string
}

type BiometricRow = {
  sleep_hours?: number | null
  stress_level_1_10?: number | null
  energy_level_self_1_10?: number | null
  contextual_energy_level_1_10?: number | null
  resting_heart_rate?: number | null
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export default function WorkoutPlanModal(props: {
  plan: WorkoutPlan | null
  open: boolean
  onClose: () => void
  fitnessGoals: FitnessGoal[]
  dashboardGoals: DashboardGoal[]
  fitnessStats: FitnessStat[]
  latestBiometric: BiometricRow | null
  onExerciseClick: (name: string) => void
  onGoNutrition: () => void
}) {
  const {
    plan,
    open,
    onClose,
    fitnessGoals,
    dashboardGoals,
    fitnessStats,
    latestBiometric,
    onExerciseClick,
    onGoNutrition,
  } = props

  const [weekIndex, setWeekIndex] = useState(0)
  const [showAdapted, setShowAdapted] = useState(true)

  const energyMeta = useMemo(() => {
    const computed = latestBiometric
      ? computeContextualEnergyLevel({
          sleep_hours: latestBiometric.sleep_hours ?? undefined,
          stress_level_1_10: latestBiometric.stress_level_1_10 ?? undefined,
          energy_level_self_1_10: latestBiometric.energy_level_self_1_10 ?? undefined,
          resting_heart_rate: latestBiometric.resting_heart_rate ?? undefined,
        })
      : computeContextualEnergyLevel({})
    const contextual =
      latestBiometric && typeof latestBiometric.contextual_energy_level_1_10 === 'number'
        ? latestBiometric.contextual_energy_level_1_10
        : computed.contextual_energy_level_1_10
    return {
      contextual,
      self: latestBiometric?.energy_level_self_1_10 ?? null,
      rationale: computed.rationale,
    }
  }, [latestBiometric])

  const mode = energyModeFromScore(energyMeta.contextual)

  const displayStructure = useMemo(() => {
    if (!plan?.weekly_structure) return {}
    const ws = plan.weekly_structure as WeeklyStructure
    if (!showAdapted) return ws
    return adaptWeeklyStructure(ws, mode)
  }, [plan?.weekly_structure, showAdapted, mode])

  const workoutDays = useMemo(() => {
    const ws = plan?.weekly_structure as WeeklyStructure | undefined
    if (!ws) return []
    return DAYS.filter((d) => (ws[d]?.exercises?.length || 0) > 0)
  }, [plan?.weekly_structure])

  if (!open || !plan) return null

  const weeks = Math.max(1, Math.min(plan.duration_weeks || 4, 16))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{plan.plan_name}</h2>
            <p className="text-sm text-gray-600 capitalize">
              {plan.plan_type} · {plan.difficulty_level} · {plan.duration_weeks} weeks ·{' '}
              {plan.frequency_per_week}x/week
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Goals context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-green-100 bg-green-50/80 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                Fitness goals & stats context
              </h3>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {fitnessGoals.slice(0, 5).map((g, i) => (
                  <li key={i}>
                    <span className="capitalize">{g.goal_type.replace(/_/g, ' ')}</span>
                    {g.target_areas?.length ? ` — ${g.target_areas.join(', ')}` : ''}
                  </li>
                ))}
                {fitnessGoals.length === 0 && (
                  <li className="text-gray-500">No fitness goals yet.</li>
                )}
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                Logged stats: {fitnessStats.length} entries (used to gauge baseline).
              </p>
            </div>

            <div className="border border-blue-100 bg-blue-50/80 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                Dashboard goals
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {dashboardGoals.slice(0, 6).map((g, i) => (
                  <li key={i}>
                    <span className="font-medium">{g.title || 'Goal'}</span>
                    {g.target_date ? (
                      <span className="text-gray-500 text-xs ml-1">
                        (target {new Date(g.target_date).toLocaleDateString()})
                      </span>
                    ) : null}
                  </li>
                ))}
                {dashboardGoals.length === 0 && (
                  <li className="text-gray-500 text-sm">No dashboard goals found.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Energy & adaptation */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-700" />
                  Contextual energy (today’s coaching estimate)
                </h3>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {energyMeta.contextual}
                  <span className="text-sm font-normal text-gray-600"> / 10</span>
                </p>
                {energyMeta.self !== null && (
                  <p className="text-xs text-gray-600">
                    Your self-report: {energyMeta.self}/10 · Mode:{' '}
                    <span className="font-medium capitalize">{mode}</span>
                  </p>
                )}
                {energyMeta.rationale.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                    {energyMeta.rationale.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setShowAdapted((v) => !v)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                    showAdapted
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-gray-800 border-gray-300'
                  }`}
                >
                  {showAdapted ? 'Showing: adapted load' : 'Showing: base plan'}
                </button>
                {energyMeta.contextual <= 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      onGoNutrition()
                      onClose()
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                  >
                    <Utensils className="h-4 w-4" />
                    Nutrition: fuel recovery
                  </button>
                )}
              </div>
            </div>
            {energyMeta.contextual <= 4 && (
              <p className="text-sm text-amber-900 mt-3">
                Lower energy today — the adapted view trims volume slightly to reduce burnout. Visit{' '}
                <strong>Nutrition</strong> to align meals with sustained energy for your dashboard
                goals.
              </p>
            )}
            {energyMeta.contextual >= 8 && mode === 'high' && (
              <p className="text-sm text-amber-900 mt-3">
                Higher capacity today — adapted view adds a modest bump where it supports your
                goals. Still prioritize form and recovery days as written in the plan.
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-green-600" />
              Plan timeline (each week follows the same weekly template below)
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: weeks }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setWeekIndex(i)}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    weekIndex === i
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Week {i + 1}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
              <span className="font-medium text-gray-800">Training days this template:</span>
              {workoutDays.map((d) => (
                <span key={d} className="px-2 py-1 bg-green-100 text-green-900 rounded capitalize">
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
          </div>

          {/* Weekly routine */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Weekly routine — Week {weekIndex + 1} of {weeks}
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="p-1 rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => setWeekIndex((w) => Math.max(0, w - 1))}
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1 rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => setWeekIndex((w) => Math.min(weeks - 1, w + 1))}
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {plan.description && (
              <p className="text-sm text-gray-600 mb-4 italic border-l-4 border-green-200 pl-3">
                {plan.description}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {DAYS.map((day) => {
                const block = displayStructure[day]
                const exercises = block?.exercises || []
                return (
                  <div
                    key={day}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 min-h-[140px]"
                  >
                    <div className="font-semibold text-gray-800 capitalize mb-2 text-sm border-b border-gray-200 pb-1">
                      {day.slice(0, 3)}
                      {block?.focus ? (
                        <span className="block text-xs font-normal text-gray-500">
                          {block.focus}
                        </span>
                      ) : null}
                    </div>
                    {exercises.length > 0 ? (
                      <div className="space-y-2">
                        {exercises.map((ex: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full text-left text-xs bg-white p-2 rounded border hover:bg-green-50"
                            onClick={() => onExerciseClick(ex.exercise_name)}
                          >
                            <div className="font-medium text-gray-900">{ex.exercise_name}</div>
                            <div className="text-gray-600">
                              {ex.sets} sets × {ex.reps}
                              {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic pt-2">
                        {day === 'sunday'
                          ? 'Rest / recovery'
                          : day === 'saturday'
                            ? 'Optional cardio or active recovery'
                            : 'Rest day'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {plan.progression_strategy && Object.keys(plan.progression_strategy).length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Progression strategy</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {Object.entries(plan.progression_strategy).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-medium">{k}:</span> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
