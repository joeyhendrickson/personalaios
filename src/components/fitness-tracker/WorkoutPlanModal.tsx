'use client'

import { useEffect, useMemo, useState } from 'react'
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
  adaptationModeFromReadiness,
  trainingDaysFromStructure,
  type WeeklyStructure,
} from '@/lib/fitness/adapt-workout-structure'
import { computeContextualEnergyLevel } from '@/lib/fitness/contextual-energy'
import {
  resolveWorkoutPlanWeeklyStructure,
  type PlanExerciseRow,
} from '@/lib/fitness/normalize-workout-plan'
import type { DashboardContextItem } from '@/lib/fitness/dashboard-context'

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
  workout_plan_exercises?: PlanExerciseRow[]
}

type FitnessGoal = {
  goal_type: string
  target_areas: string[]
  timeline_weeks: number
  priority_level: string
  description?: string
}

type DashboardGoal = DashboardContextItem

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

function formatWeight(w: number | null | undefined): string | null {
  if (w == null || w <= 0) return null
  return `${w} lbs`
}

function exerciseDetailLine(ex: {
  sets: number
  reps: string
  rest_seconds?: number
  weight_suggestion?: number | null
}): string {
  const weight = formatWeight(ex.weight_suggestion)
  const parts = [
    weight,
    `${ex.sets} sets × ${ex.reps}`,
    ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}

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
  const [showAdapted, setShowAdapted] = useState(false)

  useEffect(() => {
    if (open && plan) {
      setShowAdapted(false)
      setWeekIndex(0)
    }
  }, [open, plan?.id])

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
      stress: latestBiometric?.stress_level_1_10 ?? null,
      rationale: computed.rationale,
    }
  }, [latestBiometric])

  const mode = adaptationModeFromReadiness(energyMeta.contextual, energyMeta.stress)

  const baseStructure = useMemo(() => {
    if (!plan) return {} as WeeklyStructure
    return resolveWorkoutPlanWeeklyStructure(plan)
  }, [plan])

  const readiness = useMemo(
    () => ({
      contextualEnergy: energyMeta.contextual,
      stressLevel: energyMeta.stress,
    }),
    [energyMeta.contextual, energyMeta.stress]
  )

  const displayStructure = useMemo(() => {
    if (!showAdapted) return baseStructure
    return adaptWeeklyStructure(baseStructure, mode, readiness)
  }, [baseStructure, showAdapted, mode, readiness])

  const workoutDays = useMemo(() => {
    if (showAdapted) {
      return DAYS.filter((d) => (displayStructure[d]?.exercises?.length || 0) > 0)
    }
    return DAYS.filter((d) => (baseStructure[d]?.exercises?.length || 0) > 0)
  }, [showAdapted, displayStructure, baseStructure])

  const adaptedFrequency = trainingDaysFromStructure(displayStructure).length
  const baseFrequency = trainingDaysFromStructure(baseStructure).length

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
                Active dashboard projects &amp; goals
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                {dashboardGoals.slice(0, 6).map((g, i) => (
                  <li key={g.id ?? i}>
                    <span className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold mr-1.5">
                      {g.kind === 'project' ? 'Project' : 'Goal'}
                    </span>
                    <span className="font-medium">{g.title || 'Untitled'}</span>
                    {g.target_date ? (
                      <span className="text-gray-500 text-xs ml-1">
                        (target {new Date(g.target_date).toLocaleDateString()})
                      </span>
                    ) : null}
                  </li>
                ))}
                {dashboardGoals.length === 0 && (
                  <li className="text-gray-500 text-sm">
                    No active dashboard projects or goals right now.
                  </li>
                )}
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                Matches what you see on your dashboard today — completed items are excluded.
              </p>
            </div>
          </div>

          {/* Plan view: base (default) vs adapted for today's stress & energy */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-700" />
                  Today&apos;s readiness (stress &amp; energy)
                </h3>
                <div className="flex flex-wrap gap-4 mt-2">
                  <p className="text-2xl font-bold text-amber-900">
                    {energyMeta.contextual}
                    <span className="text-sm font-normal text-gray-600"> / 10 energy</span>
                  </p>
                  {energyMeta.stress !== null && (
                    <p className="text-2xl font-bold text-amber-900">
                      {energyMeta.stress}
                      <span className="text-sm font-normal text-gray-600"> / 10 stress</span>
                    </p>
                  )}
                </div>
                {energyMeta.self !== null && (
                  <p className="text-xs text-gray-600 mt-1">
                    Self-reported energy: {energyMeta.self}/10 · Adaptation mode:{' '}
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
              <div className="flex flex-col gap-2 shrink-0">
                <div
                  className="inline-flex rounded-lg border border-gray-300 overflow-hidden"
                  role="tablist"
                  aria-label="Workout plan view"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!showAdapted}
                    onClick={() => setShowAdapted(false)}
                    className={`px-4 py-2 text-sm font-medium border-r border-gray-300 ${
                      !showAdapted
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    Base plan
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showAdapted}
                    onClick={() => setShowAdapted(true)}
                    className={`px-4 py-2 text-sm font-medium ${
                      showAdapted
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    Adapted plan
                  </button>
                </div>
                <p className="text-xs text-gray-600 max-w-xs">
                  {showAdapted
                    ? 'Volume and rest adjusted from your current stress and energy levels.'
                    : 'Full prescribed plan — switch to Adapted plan when you want today’s tailored load.'}
                </p>
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
            {showAdapted && energyMeta.contextual <= 4 && (
              <p className="text-sm text-amber-900 mt-3">
                Lower energy or higher stress — adapted view trims volume slightly to reduce
                burnout. Visit <strong>Nutrition</strong> to align meals with recovery.
              </p>
            )}
            {showAdapted && energyMeta.contextual >= 8 && mode === 'high' && (
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
              <span className="font-medium text-gray-800">
                {showAdapted ? 'Adapted training days:' : 'Training days this template:'}
              </span>
              {workoutDays.length > 0 ? (
                workoutDays.map((d) => (
                  <span
                    key={d}
                    className={`px-2 py-1 rounded capitalize ${
                      showAdapted ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 italic">No sessions (recovery week)</span>
              )}
              {showAdapted && adaptedFrequency !== baseFrequency && (
                <span className="text-amber-800 font-medium">
                  ({baseFrequency}x/week → {adaptedFrequency}x/week)
                </span>
              )}
            </div>
          </div>

          {/* Weekly routine */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {showAdapted ? 'Adapted weekly routine' : 'Base weekly routine'} — Week{' '}
                {weekIndex + 1} of {weeks}
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
              <>
                <p className="text-sm text-gray-600 mb-4 italic border-l-4 border-green-200 pl-3">
                  {plan.description}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Plan narrative was written when this plan was generated. Use the dashboard context
                  above for your current active projects and goals.
                </p>
              </>
            )}
            {baseFrequency === 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                This plan has no saved weekly exercises yet. Generate a new plan or run migration{' '}
                <code className="text-xs">072_fitness_plan_content.sql</code> in Supabase, then
                regenerate.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {DAYS.map((day) => {
                const block = displayStructure[day]
                const baseBlock = baseStructure[day]
                const exercises = block?.exercises || []
                const baseHadWorkout = (baseBlock?.exercises?.length || 0) > 0
                const skippedForRecovery = showAdapted && baseHadWorkout && exercises.length === 0
                return (
                  <div
                    key={`${showAdapted ? 'adapted' : 'base'}-${day}`}
                    className={`border rounded-lg p-3 min-h-[140px] ${
                      showAdapted
                        ? skippedForRecovery
                          ? 'border-amber-300 bg-amber-50/80'
                          : 'border-amber-200 bg-amber-50/40'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 capitalize mb-2 text-sm border-b border-gray-200 pb-1">
                      {day.slice(0, 3)}
                      {block?.focus ? (
                        <span className="block text-xs font-normal text-gray-500">
                          {block.focus}
                        </span>
                      ) : null}
                      {block?.duration_minutes ? (
                        <span className="block text-xs font-normal text-gray-500">
                          {block.duration_minutes} min
                          {showAdapted &&
                          baseBlock?.duration_minutes &&
                          block.duration_minutes !== baseBlock.duration_minutes ? (
                            <span className="text-amber-700 ml-1">
                              (base {baseBlock.duration_minutes} min)
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    {block?.adapted_note && showAdapted && (
                      <p className="text-xs text-amber-800 mb-2 italic">{block.adapted_note}</p>
                    )}
                    {exercises.length > 0 ? (
                      <div className="space-y-2">
                        {exercises.map((ex, idx) => {
                          const baseEx = baseBlock?.exercises?.find(
                            (b) => b.exercise_name === ex.exercise_name
                          )
                          return (
                            <button
                              key={`${ex.exercise_name}-${idx}`}
                              type="button"
                              className={`w-full text-left text-xs p-2 rounded border hover:bg-green-50 ${
                                showAdapted ? 'bg-amber-50/60 border-amber-200' : 'bg-white'
                              }`}
                              onClick={() => onExerciseClick(ex.exercise_name)}
                            >
                              <div className="font-medium text-gray-900">{ex.exercise_name}</div>
                              <div className="text-gray-700">{exerciseDetailLine(ex)}</div>
                              {showAdapted && baseEx && (
                                <div className="text-[11px] text-amber-800 mt-1 space-x-2">
                                  {baseEx.sets !== ex.sets && (
                                    <span>
                                      Sets {baseEx.sets} → {ex.sets}
                                    </span>
                                  )}
                                  {baseEx.weight_suggestion &&
                                    ex.weight_suggestion &&
                                    baseEx.weight_suggestion !== ex.weight_suggestion && (
                                      <span>
                                        Weight {formatWeight(baseEx.weight_suggestion)} →{' '}
                                        {formatWeight(ex.weight_suggestion)}
                                      </span>
                                    )}
                                  {baseEx.reps !== ex.reps && (
                                    <span>
                                      Reps {baseEx.reps} → {ex.reps}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          )
                        })}
                        {showAdapted &&
                          baseBlock?.exercises &&
                          baseBlock.exercises.length > exercises.length && (
                            <p className="text-[11px] text-amber-800 italic px-1">
                              Removed from today:{' '}
                              {baseBlock.exercises
                                .filter(
                                  (b) => !exercises.some((e) => e.exercise_name === b.exercise_name)
                                )
                                .map((e) => e.exercise_name)
                                .join(', ')}
                            </p>
                          )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic pt-2">
                        {skippedForRecovery
                          ? 'Rest / recovery (session skipped in adapted plan)'
                          : day === 'sunday'
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
