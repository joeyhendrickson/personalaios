'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Target, Lightbulb } from 'lucide-react'
import { DraggableHabits } from './draggable-habits'
import { Habit } from '@/types'

interface HabitFormData {
  title: string
  description: string
  points_per_completion: number
}

export default function HabitsSection() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [formData, setFormData] = useState<HabitFormData>({
    title: '',
    description: '',
    points_per_completion: 25,
  })
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    fetchHabits()
  }, [])

  const fetchHabits = async () => {
    try {
      console.log('Fetching habits...')
      const response = await fetch('/api/habits')
      console.log('Habits response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Habits data received:', data)
        setHabits(data.habits || [])
      } else {
        const errorData = await response.json()
        console.error('Error fetching habits:', errorData)
      }
    } catch (error) {
      console.error('Error fetching habits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      const url = editingHabit ? `/api/habits/${editingHabit.id}` : '/api/habits'
      const method = editingHabit ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchHabits()
        setShowAddForm(false)
        setEditingHabit(null)
        setFormData({ title: '', description: '', points_per_completion: 25 })
      } else {
        const errorData = await response.json()
        console.error('Error saving habit:', errorData)
        alert('Failed to save habit. Please try again.')
      }
    } catch (error) {
      console.error('Error saving habit:', error)
      alert('Failed to save habit. Please try again.')
    }
  }

  const handleComplete = async (habitId: string) => {
    try {
      const response = await fetch(`/api/habits/${habitId}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        console.log(data.message)
        await fetchHabits() // Refresh to show updated completion count
      } else {
        const errorData = await response.json()
        if (errorData.error === 'Habit already completed today') {
          alert('This habit has already been completed today!')
        } else {
          console.error('Error completing habit:', errorData)
          alert('Failed to complete habit. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error completing habit:', error)
      alert('Failed to complete habit. Please try again.')
    }
  }

  const handleDelete = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return

    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchHabits()
      } else {
        console.error('Failed to delete habit')
        alert('Failed to delete habit. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting habit:', error)
      alert('Failed to delete habit. Please try again.')
    }
  }

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setFormData({
      title: habit.title,
      description: habit.description || '',
      points_per_completion: habit.points_per_completion,
    })
    setShowAddForm(true)
  }

  const handleImportDefaultHabits = async () => {
    setIsImporting(true)
    try {
      const response = await fetch('/api/habits/import-default', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        console.log(data.message)
        await fetchHabits() // Refresh the habits list
        alert(`Successfully imported ${data.habits?.length || 0} default habits!`)
      } else {
        const errorData = await response.json()
        if (errorData.message?.includes('already has habits')) {
          alert('You already have habits imported. No duplicates were created.')
        } else {
          console.error('Error importing habits:', errorData)
          const errorMessage = errorData.details || errorData.error || 'Unknown error'
          alert(`Failed to import default habits: ${errorMessage}`)
        }
      }
    } catch (error) {
      console.error('Error importing habits:', error)
      alert('Failed to import default habits. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleReorder = async (habitOrders: { id: string; order_index: number }[]) => {
    try {
      const response = await fetch('/api/habits/reorder-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits: habitOrders }),
      })

      if (response.ok) {
        await fetchHabits() // Refresh the habits list
      } else {
        const errorData = await response.json()
        console.error('Error reordering habits:', errorData)
        alert('Failed to reorder habits. Please try again.')
      }
    } catch (error) {
      console.error('Error reordering habits:', error)
      alert('Failed to reorder habits. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600">do these things every day and earn points</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setEditingHabit(null)
                setFormData({ title: '', description: '', points_per_completion: 25 })
                setShowAddForm(true)
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-10 px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              Add Habit
            </button>
            <Link href="/habitrecommendations">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 h-10 px-4 py-2">
                <Lightbulb className="h-4 w-4" />
                Ideas
              </button>
            </Link>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium mb-3">{editingHabit ? 'Edit Habit' : 'Add New Habit'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Habit title (e.g., Morning Prayer, Exercise)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Points per completion:</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.points_per_completion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points_per_completion: parseInt(e.target.value) || 25,
                    })
                  }
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                >
                  {editingHabit ? 'Update' : 'Add'} Habit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingHabit(null)
                    setFormData({ title: '', description: '', points_per_completion: 25 })
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {habits.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
            <p className="text-gray-600 mb-4">Add your first daily habit to start tracking</p>
            <button
              onClick={handleImportDefaultHabits}
              disabled={isImporting}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : 'Import Default Habits'}
            </button>
          </div>
        ) : (
          <DraggableHabits
            habits={habits}
            onReorder={handleReorder}
            onCompleteHabit={handleComplete}
            onEditHabit={handleEdit}
            onDeleteHabit={handleDelete}
          />
        )}

        {/* Weekly Habit Points Total */}
        {habits.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Weekly Habit Points</h3>
                    <p className="text-xs text-gray-600">Total points earned this week</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {habits.reduce((total, habit) => {
                      return total + habit.weekly_completion_count * habit.points_per_completion
                    }, 0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    from {habits.reduce((total, habit) => total + habit.weekly_completion_count, 0)}{' '}
                    completions
                  </div>
                </div>
              </div>

              {/* Progress bar showing weekly progress */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>This week's progress</span>
                  <span>
                    {habits.reduce((total, habit) => total + habit.weekly_completion_count, 0)} /{' '}
                    {habits.length * 7} possible
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (habits.reduce((total, habit) => total + habit.weekly_completion_count, 0) / (habits.length * 7)) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
