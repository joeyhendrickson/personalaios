import { titleSimilarity } from '@/lib/assistant/string-similarity'

export type MatchableTask = { id: string; title: string; status: string }
export type MatchableHabit = { id: string; title: string }

export type DashboardItemMatch =
  | { kind: 'task'; id: string; title: string; score: number }
  | { kind: 'habit'; id: string; title: string; score: number }

const MIN_SCORE = 0.42
const MAX_RESULTS = 3

export function matchDashboardItemsForCompletion(
  query: string,
  tasks: MatchableTask[],
  habits: MatchableHabit[]
): DashboardItemMatch[] {
  const q = query.trim()
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')

  const scored: DashboardItemMatch[] = []

  for (const task of openTasks) {
    const score = q ? titleSimilarity(q, task.title) : 0
    if (score >= MIN_SCORE) scored.push({ kind: 'task', id: task.id, title: task.title, score })
  }

  for (const habit of habits) {
    const score = q ? titleSimilarity(q, habit.title) : 0
    if (score >= MIN_SCORE) scored.push({ kind: 'habit', id: habit.id, title: habit.title, score })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
}
