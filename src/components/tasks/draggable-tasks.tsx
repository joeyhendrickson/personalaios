'use client'

import { useState } from 'react'
import { CheckCircle, Star, Settings, Target, Trash2 } from 'lucide-react'
import { Task } from '@/types'

export type TaskReorderItem = { id: string; sort_order: number; priority?: string }

interface DraggableTasksProps {
  tasks: Task[]
  onReorder: (taskOrders: TaskReorderItem[]) => Promise<void>
  onToggleTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onConvertToGoal: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

type TaskPriority = 'high' | 'medium' | 'low'

function normalizePriority(p?: string | null): TaskPriority {
  const x = (p ?? 'medium').toLowerCase()
  if (x === 'high' || x === 'low') return x
  return 'medium'
}

/** Build server payload: tier order high → medium → low; moved task is first within its tier. */
function computeTaskOrderAfterPriorityChange(
  tasks: Task[],
  taskId: string,
  newPriority: TaskPriority
): TaskReorderItem[] {
  const orderIndex = new Map(tasks.map((t, i) => [t.id, i]))
  const moved = tasks.find((t) => t.id === taskId)
  if (!moved) {
    return []
  }

  const others = tasks.filter((t) => t.id !== taskId)
  const highs = others.filter((t) => normalizePriority(t.priority) === 'high')
  const meds = others.filter((t) => normalizePriority(t.priority) === 'medium')
  const lows = others.filter((t) => normalizePriority(t.priority) === 'low')

  const sortWithin = (arr: Task[]) =>
    [...arr].sort((a, b) => orderIndex.get(a.id)! - orderIndex.get(b.id)!)

  const movedUpdated: Task = { ...moved, priority: newPriority }
  let highList = sortWithin(highs)
  let medList = sortWithin(meds)
  let lowList = sortWithin(lows)

  if (newPriority === 'high') highList = [movedUpdated, ...highList]
  else if (newPriority === 'medium') medList = [movedUpdated, ...medList]
  else lowList = [movedUpdated, ...lowList]

  const merged = [...highList, ...medList, ...lowList]
  const n = merged.length

  return merged.map((t, idx) => ({
    id: t.id,
    priority: normalizePriority(t.priority),
    sort_order: n - idx,
  }))
}

interface TaskItemProps {
  task: Task
  onToggleTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onConvertToGoal: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onSetPriority: (taskId: string, priority: TaskPriority) => void
  isReordering: boolean
}

function TaskItem({
  task,
  onToggleTask,
  onEditTask,
  onConvertToGoal,
  onDeleteTask,
  onSetPriority,
  isReordering,
}: TaskItemProps) {
  const current = normalizePriority(task.priority)

  const tierBtn = (p: TaskPriority, label: string) => (
    <button
      type="button"
      onClick={() => onSetPriority(task.id, p)}
      disabled={isReordering}
      aria-pressed={current === p}
      className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
        current === p
          ? p === 'high'
            ? 'border-red-300 bg-red-50 text-red-800'
            : p === 'medium'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-slate-300 bg-slate-100 text-slate-800'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className={`bg-white/50 rounded-lg p-4 border transition-all duration-200 hover:shadow-sm ${
        task.status === 'completed'
          ? 'border-green-200 bg-green-50/50'
          : 'border-gray-200 hover:border-blue-200'
      } ${isReordering ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onToggleTask(task.id)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all duration-200 flex-shrink-0 ${
            task.status === 'completed'
              ? 'bg-green-500 border-green-500 hover:bg-green-600'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h4
                className={`font-medium text-left ${
                  task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {task.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1 text-left leading-relaxed">
                {task.description || 'No description'}
              </p>
              {task.weekly_goal?.title && (
                <p className="text-xs text-blue-600 mt-1 text-left">📋 {task.weekly_goal.title}</p>
              )}
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 sm:ml-4">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-100 text-gray-700">
                <Star className="h-3 w-3 mr-1" />
                {task.points_value || 0}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onEditTask(task)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Edit Task"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onConvertToGoal(task)}
                  className="text-blue-500 hover:text-blue-700"
                  title="Convert to Goal"
                >
                  <Target className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Priority</span>
          <div className="flex flex-wrap gap-1 justify-end max-w-[9rem] sm:max-w-none">
            {tierBtn('high', 'High')}
            {tierBtn('medium', 'Med')}
            {tierBtn('low', 'Low')}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DraggableTasks({
  tasks,
  onReorder,
  onToggleTask,
  onEditTask,
  onConvertToGoal,
  onDeleteTask,
}: DraggableTasksProps) {
  const [isReordering, setIsReordering] = useState(false)

  const handleSetPriority = async (taskId: string, priority: TaskPriority) => {
    if (isReordering) return
    setIsReordering(true)
    try {
      const taskOrders = computeTaskOrderAfterPriorityChange(tasks, taskId, priority)
      if (taskOrders.length === 0) return
      await onReorder(taskOrders)
    } catch (error) {
      console.error('Error updating task priority:', error)
    } finally {
      setIsReordering(false)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No active tasks yet. Create your first task to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          onConvertToGoal={onConvertToGoal}
          onDeleteTask={onDeleteTask}
          onSetPriority={handleSetPriority}
          isReordering={isReordering}
        />
      ))}
    </div>
  )
}
