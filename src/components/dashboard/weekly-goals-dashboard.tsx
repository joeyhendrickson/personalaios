'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GoalForm } from '@/components/goals/goal-form'
import { GoalCard } from '@/components/goals/goal-card'
import { TaskForm } from '@/components/tasks/task-form'
import { TaskCard } from '@/components/tasks/task-card'
import { Plus, Calendar } from 'lucide-react'
import { Task } from '@/types'

interface Goal {
  id: string
  title: string
  description?: string
  category: string
  target_points: number
  target_money: number
  current_points: number
  current_money: number
  is_completed: boolean
  created_at: string
  tasks?: Task[]
}

interface Week {
  id: string
  week_start: string
  week_end: string
}

export function WeeklyGoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)

  // Get current week
  const getCurrentWeek = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return {
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: endOfWeek.toISOString().split('T')[0],
    }
  }

  // Ensure current week exists in database
  const ensureCurrentWeek = async () => {
    const weekData = getCurrentWeek()

    try {
      // Try to find existing week
      const response = await fetch(
        `/api/weeks?start=${weekData.week_start}&end=${weekData.week_end}`
      )
      if (response.ok) {
        const data = await response.json()
        if (data.week) {
          setCurrentWeek(data.week)
          return data.week.id
        }
      }

      // Create new week if it doesn't exist
      const createResponse = await fetch('/api/weeks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weekData),
      })

      if (createResponse.ok) {
        const newWeek = await createResponse.json()
        setCurrentWeek(newWeek.week)
        return newWeek.week.id
      }
    } catch (error) {
      console.error('Error ensuring current week:', error)
    }

    return null
  }

  // Fetch goals for current week
  const fetchGoals = async (weekId: string) => {
    try {
      const response = await fetch(`/api/goals?week_id=${weekId}`)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const weekId = await ensureCurrentWeek()
      if (weekId) {
        await fetchGoals(weekId)
      }
      setLoading(false)
    }

    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoalCreated = async () => {
    setShowGoalForm(false)
    if (currentWeek) {
      await fetchGoals(currentWeek.id)
    }
  }

  const handleTaskCreated = async () => {
    setShowTaskForm(false)
    setSelectedGoal(null)
    if (currentWeek) {
      await fetchGoals(currentWeek.id)
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh goals to update progress
        if (currentWeek) {
          await fetchGoals(currentWeek.id)
        }
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setGoals(goals.filter((goal) => goal.id !== goalId))
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh goals to update task lists
        if (currentWeek) {
          await fetchGoals(currentWeek.id)
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your weekly goals...</p>
        </div>
      </div>
    )
  }

  if (showGoalForm && currentWeek) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setShowGoalForm(false)} className="mb-4">
            ← Back to Dashboard
          </Button>
        </div>
        <GoalForm weekId={currentWeek.id} onSuccess={handleGoalCreated} />
      </div>
    )
  }

  if (showTaskForm && selectedGoal) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setShowTaskForm(false)} className="mb-4">
            ← Back to Dashboard
          </Button>
        </div>
        <TaskForm
          goalId={selectedGoal.id}
          goalTitle={selectedGoal.title}
          onSuccess={handleTaskCreated}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Weekly Goals Dashboard</h1>
            {currentWeek && (
              <p className="text-gray-600 flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" />
                Week of {new Date(currentWeek.week_start).toLocaleDateString()} -{' '}
                {new Date(currentWeek.week_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button onClick={() => setShowGoalForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-4">
              Start by creating your first weekly goal to track your progress.
            </p>
            <Button onClick={() => setShowGoalForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="space-y-4">
              <GoalCard
                goal={goal}
                onDelete={handleDeleteGoal}
                onAddTask={(goalId) => {
                  const goal = goals.find((g) => g.id === goalId)
                  if (goal) {
                    setSelectedGoal(goal)
                    setShowTaskForm(true)
                  }
                }}
              />

              {/* Tasks for this goal */}
              {goal.tasks && goal.tasks.length > 0 && (
                <div className="ml-6 space-y-3">
                  <h4 className="font-semibold text-gray-700">Tasks</h4>
                  {goal.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleTaskComplete}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
