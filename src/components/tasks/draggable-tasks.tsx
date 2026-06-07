'use client'

import { useState } from 'react'
import { ArrowUpToLine, CheckCircle, Star, Settings, Target, Trash2 } from 'lucide-react'
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
  index: number
  onToggleTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onConvertToGoal: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onSetPriority: (taskId: string, priority: TaskPriority) => void
  onMoveToTop: (taskId: string) => void
  isReordering: boolean
}

function TaskItem({
  task,
  index,
  onToggleTask,
  onEditTask,
  onConvertToGoal,
  onDeleteTask,
  onSetPriority,
  onMoveToTop,
  isReordering,
}: TaskItemProps) {
  const current = normalizePriority(task.priority)

  const tierBtn = (p: TaskPriority, label: string) => (
    <button
      type="button"
      onClick={() => onSetPriority(task.id, p)}
      disabled={isReordering}
      aria-pressed={current === p}
      className={`task-priority-btn px-2 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-50 ${
        current === p
          ? p === 'high'
            ? 'task-priority-btn-active-high border-red-300 bg-red-50 text-red-800'
            : p === 'medium'
              ? 'task-priority-btn-active-med border-amber-300 bg-amber-50 text-amber-900'
              : 'task-priority-btn-active-low border-slate-300 bg-slate-100 text-slate-800'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className={`task-card rounded-lg border p-4 transition-all duration-200 hover:shadow-sm ${
        task.status === 'completed'
          ? 'border-green-200 bg-green-50/50'
          : 'border-gray-200 bg-white/50 hover:border-blue-200'
      } ${isReordering ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleTask(task.id)}
          className={`task-checkbox mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all duration-200 ${
            task.status === 'completed'
              ? 'border-green-500 bg-green-500 hover:bg-green-600'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-white" />}
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="min-w-0">
            <h4
              className={`task-card-title w-full break-words text-left font-medium ${
                task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>
            <p className="task-card-description mt-1 w-full break-words text-left text-sm leading-relaxed text-gray-600">
              {task.description || 'No description'}
            </p>
            {task.weekly_goal?.title && (
              <p className="task-linked-project mt-1 w-full break-words text-left text-xs text-blue-600">
                📋 {task.weekly_goal.title}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="task-points-badge inline-flex items-center rounded-full border bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              <Star className="mr-1 h-3 w-3" />
              {task.points_value || 0}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditTask(task)}
                className="task-edit-btn touch-manipulation text-gray-500 hover:text-gray-700"
                title="Edit Task"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => onConvertToGoal(task)}
                className="task-convert-btn touch-manipulation text-blue-500 hover:text-blue-700"
                title="Convert to Goal"
              >
                <Target className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                className="task-delete-btn touch-manipulation text-red-500 hover:text-red-700"
                title="Delete Task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="task-priority-row flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
            <span className="task-priority-label text-[10px] uppercase tracking-wide text-gray-500">
              Priority
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveToTop(task.id)}
                disabled={index === 0 || isReordering}
                className={`task-move-top touch-manipulation rounded-md border p-1 transition-colors ${
                  index === 0 || isReordering
                    ? 'cursor-not-allowed border-transparent text-gray-300'
                    : 'border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }`}
                title="Move to top"
              >
                <ArrowUpToLine className="h-4 w-4" />
              </button>
              {tierBtn('high', 'High')}
              {tierBtn('medium', 'Med')}
              {tierBtn('low', 'Low')}
            </div>
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

  /** Pin to first row: high priority + first among highs (matches API tier + sort_order rules). */
  const handleMoveToTop = async (taskId: string) => {
    if (isReordering) return
    setIsReordering(true)
    try {
      const taskOrders = computeTaskOrderAfterPriorityChange(tasks, taskId, 'high')
      if (taskOrders.length === 0) return
      await onReorder(taskOrders)
    } catch (error) {
      console.error('Error moving task to top:', error)
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
      {tasks.map((task, index) => (
        <TaskItem
          key={task.id}
          task={task}
          index={index}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          onConvertToGoal={onConvertToGoal}
          onDeleteTask={onDeleteTask}
          onSetPriority={handleSetPriority}
          onMoveToTop={handleMoveToTop}
          isReordering={isReordering}
        />
      ))}
    </div>
  )
}
