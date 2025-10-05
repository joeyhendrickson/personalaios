'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle, Trash2, Edit, Calendar, GripVertical, Target } from 'lucide-react'
import { Habit } from '@/types'

interface DraggableHabitsProps {
  habits: Habit[]
  onReorder: (habitOrders: { id: string; order_index: number }[]) => Promise<void>
  onCompleteHabit: (habitId: string) => void
  onEditHabit: (habit: Habit) => void
  onDeleteHabit: (habitId: string) => void
}

interface SortableHabitItemProps {
  habit: Habit
  onCompleteHabit: (habitId: string) => void
  onEditHabit: (habit: Habit) => void
  onDeleteHabit: (habitId: string) => void
}

function SortableHabitItem({
  habit,
  onCompleteHabit,
  onEditHabit,
  onDeleteHabit,
}: SortableHabitItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isCompletedToday = (lastCompleted?: string) => {
    if (!lastCompleted) return false
    const today = new Date().toDateString()
    const completedDate = new Date(lastCompleted).toDateString()
    return today === completedDate
  }

  const completedToday = isCompletedToday(habit.last_completed)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
        completedToday
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200 hover:border-green-200'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <button
        onClick={() => onCompleteHabit(habit.id)}
        disabled={completedToday}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          completedToday
            ? 'bg-green-500 border-green-500 cursor-not-allowed'
            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
        }`}
        title={completedToday ? 'Completed today' : 'Mark as completed'}
      >
        {completedToday && <CheckCircle className="h-4 w-4 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h4
            className={`font-medium ${completedToday ? 'line-through text-gray-500' : 'text-gray-900'}`}
          >
            {habit.title}
          </h4>
          <span className="text-sm text-gray-500">+{habit.points_per_completion} pts</span>
        </div>
        {habit.description && <p className="text-sm text-gray-600 mb-1">{habit.description}</p>}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{habit.weekly_completion_count} this week</span>
          </div>
          {completedToday && <span className="text-green-600 font-medium">✓ Completed today</span>}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onEditHabit(habit)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Edit habit"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDeleteHabit(habit.id)}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete habit"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function DraggableHabits({
  habits,
  onReorder,
  onCompleteHabit,
  onEditHabit,
  onDeleteHabit,
}: DraggableHabitsProps) {
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setIsReordering(true)

    try {
      const oldIndex = habits.findIndex((habit) => habit.id === active.id)
      const newIndex = habits.findIndex((habit) => habit.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedHabits = arrayMove(habits, oldIndex, newIndex)

        // Create new order indices (lower numbers = higher priority)
        const habitOrders = reorderedHabits.map((habit, index) => ({
          id: habit.id,
          order_index: index,
        }))

        await onReorder(habitOrders)
      }
    } catch (error) {
      console.error('Error reordering habits:', error)
    } finally {
      setIsReordering(false)
    }
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No habits yet. Add your first daily habit to get started!</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={habits.map((habit) => habit.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {habits.map((habit) => (
            <SortableHabitItem
              key={habit.id}
              habit={habit}
              onCompleteHabit={onCompleteHabit}
              onEditHabit={onEditHabit}
              onDeleteHabit={onDeleteHabit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
