'use client'

import { useState } from 'react'
import { CheckCircle, Star, Settings, Target, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { Task } from '@/types'

interface DraggableTasksProps {
  tasks: Task[]
  onReorder: (taskOrders: { id: string; sort_order: number }[]) => Promise<void>
  onToggleTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onConvertToGoal: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

interface TaskItemProps {
  task: Task
  index: number
  totalTasks: number
  onToggleTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onConvertToGoal: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isReordering: boolean
}

function TaskItem({
  task,
  index,
  totalTasks,
  onToggleTask,
  onEditTask,
  onConvertToGoal,
  onDeleteTask,
  onMoveUp,
  onMoveDown,
  isReordering,
}: TaskItemProps) {
  return (
    <div
      className={`bg-white/50 rounded-lg p-4 border transition-all duration-200 hover:shadow-sm ${
        task.status === 'completed'
          ? 'border-green-200 bg-green-50/50'
          : 'border-gray-200 hover:border-blue-200'
      } ${isReordering ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start space-x-4">
        {/* Move Up/Down Buttons */}
        <div className="flex flex-col gap-1 mt-1">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0 || isReordering}
            className={`p-0.5 rounded transition-colors ${
              index === 0 || isReordering
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalTasks - 1 || isReordering}
            className={`p-0.5 rounded transition-colors ${
              index === totalTasks - 1 || isReordering
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => onToggleTask(task.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all duration-200 ${
            task.status === 'completed'
              ? 'bg-green-500 border-green-500 hover:bg-green-600'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4
                className={`font-medium ${
                  task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                }`}
              >
                {task.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">{task.description || 'No description'}</p>
              {task.weekly_goal?.title && (
                <p className="text-xs text-blue-600 mt-1">📋 {task.weekly_goal.title}</p>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-100 text-gray-700">
                <Star className="h-3 w-3 mr-1" />
                {task.points_value || 0}
              </span>
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

  const handleMoveUp = async (index: number) => {
    if (index === 0 || isReordering) return

    setIsReordering(true)
    try {
      // Swap with the item above
      const newTasks = [...tasks]
      const temp = newTasks[index]
      newTasks[index] = newTasks[index - 1]
      newTasks[index - 1] = temp

      // Create new sort orders
      const taskOrders = newTasks.map((task, idx) => ({
        id: task.id,
        sort_order: idx + 1,
      }))

      await onReorder(taskOrders)
    } catch (error) {
      console.error('Error moving task up:', error)
    } finally {
      setIsReordering(false)
    }
  }

  const handleMoveDown = async (index: number) => {
    if (index === tasks.length - 1 || isReordering) return

    setIsReordering(true)
    try {
      // Swap with the item below
      const newTasks = [...tasks]
      const temp = newTasks[index]
      newTasks[index] = newTasks[index + 1]
      newTasks[index + 1] = temp

      // Create new sort orders
      const taskOrders = newTasks.map((task, idx) => ({
        id: task.id,
        sort_order: idx + 1,
      }))

      await onReorder(taskOrders)
    } catch (error) {
      console.error('Error moving task down:', error)
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
          totalTasks={tasks.length}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          onConvertToGoal={onConvertToGoal}
          onDeleteTask={onDeleteTask}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          isReordering={isReordering}
        />
      ))}
    </div>
  )
}
