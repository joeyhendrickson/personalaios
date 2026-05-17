'use client'

export type LinkableGoal = {
  id: string
  title: string
  goal_type?: string
}

export function buildLinkableGoals(
  activeGoals: Record<string, unknown>[],
  completedGoals: Record<string, unknown>[],
  currentGoalId?: string | null
): LinkableGoal[] {
  const linkable: LinkableGoal[] = activeGoals.map((g) => ({
    id: g.id as string,
    title: g.title as string,
    goal_type: g.goal_type as string | undefined,
  }))

  if (currentGoalId && !linkable.some((g) => g.id === currentGoalId)) {
    const completed = completedGoals.find((g) => g.id === currentGoalId)
    if (completed) {
      linkable.push({
        id: completed.id as string,
        title: `${completed.title as string} (completed)`,
        goal_type: completed.goal_type as string | undefined,
      })
    }
  }

  return linkable
}

export function resolveLinkedGoalTitle(
  goalId: string | null | undefined,
  activeGoals: Record<string, unknown>[],
  completedGoals: Record<string, unknown>[]
): string | null {
  if (!goalId) return null
  const match = [...activeGoals, ...completedGoals].find((g) => g.id === goalId)
  return match ? (match.title as string) : null
}

export function ProjectGoalLinkSelect({
  value,
  onChange,
  goals,
  id,
}: {
  value: string
  onChange: (goalId: string) => void
  goals: LinkableGoal[]
  id?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Link to goal <span className="text-gray-400 text-xs font-normal">(optional)</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">No goal linked</option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
            {goal.goal_type ? ` (${goal.goal_type})` : ''}
          </option>
        ))}
      </select>
      {goals.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Add a goal in the Goals section first if you want to link this project.
        </p>
      )}
    </div>
  )
}
