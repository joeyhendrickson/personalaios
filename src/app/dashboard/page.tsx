'use client'

import { useState, useEffect } from 'react'
import {
  Target,
  CheckCircle,
  TrendingUp,
  Plus,
  Calendar,
  BarChart3,
  MessageSquare,
  ArrowLeft,
  Star,
  Activity,
  PieChart,
  Settings,
  ChevronRight,
  Play,
  Pause,
  X,
  Trash2,
  FileSpreadsheet,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import { ChatInterface } from '@/components/chat/chat-interface'
import { useAuth } from '@/contexts/auth-context'
import { Slider } from '@/components/ui/slider'
import { AccomplishmentsHistory } from '@/components/accomplishments/accomplishments-history'
import ManualPriorityForm from '@/components/priorities/manual-priority-form'
import ConversationalPriorityInput from '@/components/priorities/conversational-priority-input'
import HabitsSection from '@/components/habits/habits-section'
import EducationSection from '@/components/education/education-section'
import ActiveProjectsWidget from '@/components/dashboard/active-projects-widget'
import { useActivityTracking } from '@/hooks/use-activity-tracking'
import { useAdminAuth } from '@/hooks/use-admin-auth'

// Type definitions
interface Goal {
  id: string
  title: string
  description?: string
  category: string
  target_points: number
  target_money: number
  current_points?: number
  week_id: string
  user_id: string
  created_at: string
  updated_at: string
  tasks?: Task[]
}

interface Task {
  id: string
  title: string
  description?: string
  category: string
  points_value: number
  money_value: number
  weekly_goal_id: string
  user_id: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  weekly_goal?: Goal
}

interface Week {
  id: string
  week_start: string
  week_end: string
  user_id: string
  created_at: string
  updated_at: string
}

// Progress Ring Component
interface ProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}

const ProgressRing = ({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const { logActivity } = useActivityTracking()
  const { isAdmin } = useAdminAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(true)
  const [pointsData, setPointsData] = useState<{
    dailyPoints: number
    weeklyPoints: number
    dailyBreakdown: Array<{ date: string; points: number; dayName: string }>
  } | null>(null)
  const [pointsLoading, setPointsLoading] = useState(false)
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null)
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({})
  const [showPointsDetails, setShowPointsDetails] = useState(false)
  const [userTimezone, setUserTimezone] = useState<string>('America/New_York') // Default to Eastern
  const [pointsHistory, setPointsHistory] = useState<Record<string, unknown>[]>([])
  const [highLevelGoals, setHighLevelGoals] = useState<Record<string, unknown>[]>([])
  const [priorities, setPriorities] = useState<Record<string, unknown>[]>([])
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddHighLevelGoal, setShowAddHighLevelGoal] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [showEditHighLevelGoal, setShowEditHighLevelGoal] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [accomplishments, setAccomplishments] = useState<Record<string, unknown>[]>([])
  const [showAccomplishmentsHistory, setShowAccomplishmentsHistory] = useState(false)
  const [showManualPriorityForm, setShowManualPriorityForm] = useState(false)
  const [showConversationalPriorityInput, setShowConversationalPriorityInput] = useState(false)
  const [triggerChatOpen, setTriggerChatOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'other',
    target_points: 10,
  })

  // Reset chat trigger after it's been used
  useEffect(() => {
    if (triggerChatOpen) {
      const timer = setTimeout(() => setTriggerChatOpen(false), 100)
      return () => clearTimeout(timer)
    }
  }, [triggerChatOpen])
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'other',
    points_value: 5,
    weekly_goal_id: '',
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData()
    fetchUserTimezone()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch current week
      const weekResponse = await fetch('/api/weeks')
      if (weekResponse.ok) {
        const weekData = await weekResponse.json()
        if (weekData.weeks && weekData.weeks.length > 0) {
          setCurrentWeek(weekData.weeks[0])
        }
      }

      // Fetch projects (weekly_goals)
      const projectsResponse = await fetch('/api/projects')
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        setGoals(projectsData.projects || [])
      }

      // Fetch tasks
      const tasksResponse = await fetch('/api/tasks')
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData.tasks || [])
      }

      // Fetch points data
      console.log('Fetching points data...')
      setPointsLoading(true)
      const pointsResponse = await fetch('/api/points')
      console.log('Points response status:', pointsResponse.status)

      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json()
        console.log('Points data received:', pointsData)
        console.log('Setting points data state with:', {
          dailyPoints: pointsData.dailyPoints,
          weeklyPoints: pointsData.weeklyPoints,
          dailyBreakdown: pointsData.dailyBreakdown,
        })
        setPointsData(pointsData)
      } else {
        const errorData = await pointsResponse.json()
        console.error('Points API error:', errorData)
      }
      setPointsLoading(false)

      // Fetch accomplishments
      await fetchAccomplishments()

      // Fetch goals and priorities
      await fetchHighLevelGoals()
      await fetchPriorities()
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccomplishments = async () => {
    try {
      const response = await fetch('/api/accomplishments?limit=5')
      if (response.ok) {
        const data = await response.json()
        setAccomplishments(data.accomplishments || [])
      }
    } catch (error) {
      console.error('Error fetching accomplishments:', error)
    }
  }

  const fetchPointsHistory = async () => {
    try {
      const response = await fetch('/api/points/history')
      if (response.ok) {
        const data = await response.json()
        setPointsHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching points history:', error)
    }
  }

  const fetchHighLevelGoals = async () => {
    try {
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        setHighLevelGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Error fetching high-level goals:', error)
    }
  }

  const fetchPriorities = async () => {
    try {
      console.log('Fetching priorities...')
      // First sync fires priorities to ensure they're included
      await fetch('/api/priorities/sync-fires', { method: 'POST' })

      // Then fetch all priorities
      const response = await fetch('/api/priorities')
      console.log('Priorities response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Priorities data received:', data)
        setPriorities(data.priorities || [])
      } else {
        const errorData = await response.json()
        console.error('Error fetching priorities:', errorData)
      }
    } catch (error) {
      console.error('Error fetching priorities:', error)
    }
  }

  const fetchUserTimezone = async () => {
    try {
      const response = await fetch('/api/user/timezone')
      if (response.ok) {
        const data = await response.json()
        setUserTimezone(data.timezone || 'America/New_York')
      }
    } catch (error) {
      console.error('Error fetching user timezone:', error)
    }
  }

  const updateUserTimezone = async (newTimezone: string) => {
    try {
      const response = await fetch('/api/user/timezone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timezone: newTimezone }),
      })

      if (response.ok) {
        setUserTimezone(newTimezone)
        // Refresh points data with new timezone
        await fetchDashboardData()
      } else {
        console.error('Failed to update timezone')
      }
    } catch (error) {
      console.error('Error updating timezone:', error)
    }
  }

  // Calculate progress metrics
  const totalTargetPoints = goals.reduce((sum, goal) => sum + (goal as any).target_points, 0)
  const totalCurrentPoints = goals.reduce(
    (sum, goal) => sum + ((goal as any).current_points || 0),
    0
  )
  const progressPercentage =
    totalTargetPoints > 0 ? Math.round((totalCurrentPoints / totalTargetPoints) * 100) : 0

  // Calculate points by category (from both goals and tasks)
  const categoryPoints = [...goals, ...tasks].reduce(
    (acc, item) => {
      const category = item.category
      if (!acc[category]) {
        acc[category] = { current: 0, target: 0 }
      }

      if ('current_points' in item) {
        // This is a goal
        acc[category].current += item.current_points || 0
        acc[category].target += item.target_points
      } else if ('status' in item) {
        // This is a task
        if (item.status === 'completed') {
          acc[category].current += item.points_value
        }
        // Tasks don't have target points, so we don't add to target
      }

      return acc
    },
    {} as Record<string, { current: number; target: number }>
  )

  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalTasks = tasks.length
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleAddGoal = async () => {
    if (newGoal.title.trim() && currentWeek) {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newGoal.title,
            description: newGoal.description,
            category: newGoal.category,
            target_points: newGoal.target_points,
            target_money: 0,
          }),
        })

        if (response.ok) {
          await fetchDashboardData() // Refresh data
          setNewGoal({ title: '', description: '', category: 'other', target_points: 10 })
          setShowAddGoal(false)
        }
      } catch (error) {
        console.error('Error creating goal:', error)
      }
    }
  }

  const handleAddTask = async () => {
    if (newTask.title.trim()) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekly_goal_id: newTask.weekly_goal_id || undefined,
            title: newTask.title,
            description: newTask.description,
            category: newTask.category,
            points_value: newTask.points_value,
            money_value: 0,
          }),
        })

        if (response.ok) {
          await fetchDashboardData() // Refresh data
          setNewTask({
            title: '',
            description: '',
            category: 'other',
            points_value: 5,
            weekly_goal_id: '',
          })
          setShowAddTask(false)
        }
      } catch (error) {
        console.error('Error creating task:', error)
      }
    }
  }

  const toggleTask = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const newStatus = task.status === 'completed' ? 'pending' : 'completed'
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // If task was completed, add points to the ledger
        if (newStatus === 'completed') {
          try {
            await fetch('/api/points/ledger', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                task_id: taskId,
                points: task.points_value,
                description: `Completed "${(task as any).title}"`,
              }),
            })
          } catch (pointsError) {
            console.error('Error adding points to ledger:', pointsError)
          }
        }

        await fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDashboardData() // Refresh data
        alert('Project deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to delete project: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert(`Error deleting project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const deleteHighLevelGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return
    }

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDashboardData() // Refresh data
        alert('Goal deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to delete goal: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert(`Error deleting goal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const convertGoalToTask = async (goal: Goal) => {
    try {
      console.log('Converting goal to task:', goal)

      // Create a task from the goal first
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: (goal as any).title,
          description: (goal as any).description || '',
          points_value: (goal as any).target_points,
          money_value: 0,
          // Don't set weekly_goal_id since we're converting the goal to a task
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Task creation error:', errorData)
        alert(`Failed to create task: ${errorData.error || 'Unknown error'}`)
        return // Don't delete the goal if task creation failed
      }

      const result = await response.json()
      console.log('Task created successfully:', result)

      // Only delete the original goal if task creation was successful
      const deleteResponse = await fetch(`/api/projects/${goal.id}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        console.warn('Failed to delete original goal, but task was created successfully')
      }

      // Refresh the data to show the changes
      await fetchDashboardData()
      console.log('Dashboard data refreshed')
    } catch (error) {
      console.error('Error converting goal to task:', error)
      alert(
        `Error converting goal to task: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const convertTaskToGoal = async (task: Task) => {
    try {
      console.log('Converting task to goal:', task)

      // Use the current week or get the first available week
      let weekId = currentWeek?.id
      console.log('Current week ID:', weekId)

      if (!weekId) {
        console.log('No current week, fetching available weeks...')
        // Get the first available week
        const weekResponse = await fetch('/api/weeks')
        if (weekResponse.ok) {
          const weekData = await weekResponse.json()
          console.log('Available weeks:', weekData)
          if (weekData.weeks && weekData.weeks.length > 0) {
            weekId = weekData.weeks[0].id
            console.log('Using week ID:', weekId)
          }
        }
      }

      if (!weekId) {
        console.error('No week available')
        alert('No week available. Please create a week first.')
        return
      }

      const goalData = {
        title: (task as any).title,
        description: task.description || '',
        category: 'other', // Default category, will be sorted later with AI button
        target_points: task.points_value,
        target_money: 0,
        week_id: weekId,
      }

      console.log('Creating goal with data:', goalData)

      // Create a goal from the task
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: (task as any).title,
          description: task.description || '',
          category: 'other', // Default category, will be sorted later with AI button
          target_points: task.points_value,
          target_money: 0,
        }),
      })

      console.log('Goal creation response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Goal creation error:', errorData)
        alert(`Failed to convert task to goal: ${errorData.error || 'Unknown error'}`)
        return
      }

      const result = await response.json()
      console.log('Goal created successfully:', result)

      // Delete the original task since we've converted it to a goal
      console.log('Deleting original task:', task.id)
      const deleteResponse = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        console.warn('Failed to delete original task, but goal was created successfully')
      } else {
        console.log('Original task deleted successfully')
      }

      // Refresh the data to show the changes
      await fetchDashboardData()
      console.log('Dashboard data refreshed')
    } catch (error) {
      console.error('Error converting task to goal:', error)
      alert(
        `Error converting task to goal: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDashboardData() // Refresh data
        alert('Task deleted successfully!')
      } else {
        const errorData = await response.json()
        alert(`Failed to delete task: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert(`Error deleting task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const categorizeGoalsWithAI = async () => {
    try {
      setIsCategorizing(true)
      console.log('Starting AI categorization of goals...')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch('/api/goals/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to categorize goals')
      }

      const result = await response.json()
      console.log('Categorization result:', result)

      // Refresh the dashboard data to show updated categories
      await fetchDashboardData()

      // Show success message
      alert(
        `AI Categorization Complete!\n\n${result.message}\n\nUpdated ${result.categorized} goals with new categories.`
      )
    } catch (error) {
      console.error('Error categorizing goals:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Categorization timed out. Please try again.')
      } else {
        alert(
          `Error categorizing goals: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    } finally {
      setIsCategorizing(false)
    }
  }

  // Handle slider change locally (no API call)
  const handleProgressChange = (goalId: string, progressPercentage: number) => {
    setLocalProgress((prev) => ({
      ...prev,
      [goalId]: progressPercentage,
    }))
  }

  // Handle slider release (API call)
  const handleProgressCommit = async (goalId: string, progressPercentage: number) => {
    try {
      setUpdatingProgress(goalId)
      console.log(`Updating goal ${goalId} progress to ${progressPercentage}%`)

      const response = await fetch(`/api/projects/${goalId}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progress: progressPercentage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Progress update failed:', errorData)
        throw new Error(errorData.error || 'Failed to update goal progress')
      }

      const result = await response.json()
      console.log('Progress update result:', result)

      // Refresh the dashboard data to show updated progress and points
      console.log('Refreshing dashboard data after progress update...')
      await fetchDashboardData()
      console.log('Dashboard data refreshed')

      // Clear local progress state
      setLocalProgress((prev) => {
        const newState = { ...prev }
        delete newState[goalId]
        return newState
      })

      // Show success message if points changed
      if (result.goal && result.goal.points_earned !== 0) {
        if (result.goal.points_earned > 0) {
          console.log(`Earned ${result.goal.points_earned} points for goal progress!`)
        } else {
          console.log(
            `Lost ${Math.abs(result.goal.points_earned)} points due to progress reduction!`
          )
        }
        // You could add a toast notification here if you want
      }
    } catch (error) {
      console.error('Error updating goal progress:', error)
      alert(
        `Error updating goal progress: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      // Clear local progress state on error
      setLocalProgress((prev) => {
        const newState = { ...prev }
        delete newState[goalId]
        return newState
      })
    } finally {
      setUpdatingProgress(null)
    }
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowEditGoal(true)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setShowEditTask(true)
  }

  const openEditHighLevelGoal = (goal: Record<string, unknown>) => {
    setEditingGoal(goal as any)
    setShowEditHighLevelGoal(true)
  }

  const updateGoal = async (updatedGoal: Partial<Goal>) => {
    if (!editingGoal) return

    try {
      const response = await fetch(`/api/projects/${editingGoal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGoal),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update goal')
      }

      await fetchDashboardData()
      setShowEditGoal(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error updating goal:', error)
      alert(`Error updating goal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const updateHighLevelGoal = async (updatedGoal: Record<string, unknown>) => {
    if (!editingGoal) return

    try {
      const response = await fetch(`/api/goals/${editingGoal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGoal),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update goal')
      }

      await fetchDashboardData()
      setShowEditHighLevelGoal(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error updating goal:', error)
      alert(`Error updating goal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const updateTask = async (updatedTask: Partial<Task>) => {
    if (!editingTask) return

    try {
      console.log('Updating task with data:', updatedTask)
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Task update error:', errorData)
        throw new Error(errorData.error || 'Failed to update task')
      }

      await fetchDashboardData()
      setShowEditTask(false)
      setEditingTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
      alert(`Error updating task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black">Personal AI OS</h1>
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {currentWeek ? (
                    <>
                      Week of {new Date(currentWeek.week_start).toLocaleDateString()} -{' '}
                      {new Date(currentWeek.week_end).toLocaleDateString()}
                    </>
                  ) : (
                    'Loading...'
                  )}
                </p>
                {user && <p className="text-xs text-gray-500 mt-1">Welcome back, {user.email}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/import">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3">
                  <FileSpreadsheet className="h-4 w-4" />
                  Import Excel
                </button>
              </Link>
              <Link href="/profile">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-9 rounded-md px-3">
                  <Settings className="h-4 w-4" />
                  Profile
                </button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 h-9 rounded-md px-3">
                    <Brain className="h-4 w-4" />
                    Admin
                  </button>
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 h-9 rounded-md px-3"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Daily Points Chart */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pointsData?.dailyPoints || 0}
                    {pointsLoading && <span className="text-sm text-blue-500 ml-2">⟳</span>}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Weekly: {pointsData?.weeklyPoints || 0}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                  <button
                    onClick={() => {
                      setShowPointsDetails(true)
                      fetchPointsHistory()
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                    title="View Details & Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="flex items-end space-x-1 h-12">
                  {pointsData?.dailyBreakdown?.map((day, index) => {
                    const maxPoints = Math.max(
                      ...(pointsData.dailyBreakdown?.map((d) => d.points) || [1])
                    )
                    const height = maxPoints > 0 ? (day.points / maxPoints) * 100 : 0
                    const isToday =
                      day.dayName ===
                      new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        timeZone: userTimezone,
                      })
                    return (
                      <div
                        key={index}
                        className={`rounded-t relative group ${isToday ? 'bg-orange-600' : 'bg-orange-400'}`}
                        style={{
                          width: '8px',
                          height: `${height}%`,
                          opacity: 0.7 + (index / 7) * 0.3,
                        }}
                        title={`${day.dayName}: ${day.points} points${isToday ? ' (Today)' : ''}`}
                      />
                    )
                  }) ||
                    [0, 0, 0, 0, 0, 0, 0].map((_, index) => (
                      <div
                        key={index}
                        className="bg-gray-300 rounded-t"
                        style={{
                          width: '8px',
                          height: '10%',
                          opacity: 0.3,
                        }}
                      />
                    ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                {pointsData?.dailyBreakdown?.map((day, index) => {
                  const isToday =
                    day.dayName ===
                    new Date().toLocaleDateString('en-US', {
                      weekday: 'short',
                      timeZone: userTimezone,
                    })
                  return (
                    <span
                      key={index}
                      className={`text-center ${isToday ? 'font-bold text-orange-600' : ''}`}
                    >
                      {day.dayName}
                    </span>
                  )
                }) ||
                  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                    const isToday =
                      day ===
                      new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        timeZone: userTimezone,
                      })
                    return (
                      <span
                        key={index}
                        className={`text-center ${isToday ? 'font-bold text-orange-600' : ''}`}
                      >
                        {day}
                      </span>
                    )
                  })}
              </div>
              <div className="text-center mt-2">
                <p className="text-sm text-gray-600">
                  Daily & Weekly Points ({userTimezone.split('/')[1]})
                </p>
              </div>
            </div>
          </div>

          {/* Weekly Progress Ring */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Project Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalCurrentPoints}/{totalTargetPoints}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
              <div className="flex justify-center">
                <ProgressRing percentage={progressPercentage} size={100} color="#8B5CF6" />
              </div>
            </div>
          </div>

          {/* Active Projects with Recommendations */}
          <ActiveProjectsWidget goals={goals as any} />

          {/* Task Completion */}
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tasks Done</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedTasks}/{totalTasks}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
              <div className="flex justify-center">
                <ProgressRing percentage={taskCompletionRate} size={80} color="#8B5CF6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* Priorities Section - TOP */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight flex items-center text-xl">
                      <Brain className="h-6 w-6 mr-2 text-purple-500" />
                      Priorities
                    </h2>
                    <p className="text-sm text-gray-600">
                      AI-recommended and manual priorities for today
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowConversationalPriorityInput(true)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-black hover:bg-gray-800 text-white h-10 px-4 py-2"
                    >
                      <Brain className="h-4 w-4" />
                      AI Recommend
                    </button>
                    <button
                      onClick={() => setShowManualPriorityForm(true)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-10 px-4 py-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Priority
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0">
                {priorities.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No priorities set</h3>
                    <p className="text-gray-600 mb-4">
                      Generate AI recommendations or add manual priorities
                    </p>
                    <button
                      onClick={() => setShowConversationalPriorityInput(true)}
                      className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Brain className="h-4 w-4 inline mr-2" />
                      Generate AI Priorities
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priorities.map((priority, index) => (
                      <div
                        key={(priority as any).id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                          priority.is_completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 w-6">
                            #{index + 1}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/priorities/${priority.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ is_completed: !priority.is_completed }),
                                })
                                if (response.ok) {
                                  await fetchPriorities()
                                }
                              } catch (error) {
                                console.error('Error updating priority:', error)
                              }
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              priority.is_completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {(priority as any).is_completed && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4
                              className={`font-medium ${priority.is_completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                            >
                              {(priority as any).title}
                            </h4>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                priority.priority_type === 'ai_recommended'
                                  ? 'bg-gray-100 text-gray-800'
                                  : priority.priority_type === 'fire_auto'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {priority.priority_type === 'ai_recommended'
                                ? 'AI'
                                : priority.priority_type === 'fire_auto'
                                  ? 'FIRE'
                                  : 'Manual'}
                            </span>
                            <span className="text-xs text-gray-500">
                              Score: {(priority as any).priority_score}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{(priority as any).description}</p>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button className="text-gray-400 hover:text-gray-600">
                            <Settings className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Goals Section - SECOND */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight flex items-center text-xl">
                      <Target className="h-6 w-6 mr-2 text-red-500" />
                      Goals
                    </h2>
                    <p className="text-sm text-gray-600">
                      High-level weekly and monthly objectives
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddHighLevelGoal(true)}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-10 px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Goal
                  </button>
                </div>
              </div>
              <div className="p-6 pt-0">
                {highLevelGoals.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first goal to start building your roadmap
                    </p>
                    <button
                      onClick={() => setShowAddHighLevelGoal(true)}
                      className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add Your First Goal
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highLevelGoals.map((goal) => (
                      <div
                        key={(goal as any).id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {(goal as any).title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {(goal as any).description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                {(goal as any).goal_type}
                              </span>
                              <span>Priority: {(goal as any).priority_level}/5</span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openEditHighLevelGoal(goal)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Edit Goal"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteHighLevelGoal((goal as any).id)}
                              className="text-gray-400 hover:text-red-600"
                              title="Delete Goal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {(goal as any).target_value && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>
                                {(goal as any).current_value}/{(goal as any).target_value}{' '}
                                {(goal as any).target_unit || ''}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-black h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(100, ((goal as any).current_value / (goal as any).target_value) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          {(goal as any).target_date &&
                            `Target: ${new Date((goal as any).target_date).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Projects Section - THIRD */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight flex items-center text-xl">
                      <Target className="h-6 w-6 mr-2 text-blue-500" />
                      Projects
                    </h2>
                    <p className="text-sm text-gray-600">
                      Track your progress across different projects and goal categories
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={categorizeGoalsWithAI}
                      disabled={isCategorizing || goals.length === 0}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 h-10 px-4 py-2"
                      title="Use AI to automatically categorize your goals with smart financial detection"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {isCategorizing ? 'Categorizing...' : 'Categorize'}
                    </button>
                    <button
                      onClick={() => setShowAddGoal(true)}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white hover:bg-gray-800 h-10 px-4 py-2 bg-black"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    <div className="col-span-2 text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading projects...</p>
                    </div>
                  ) : goals.length === 0 ? (
                    <div className="col-span-2 text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No projects yet. Create your first project to get started!
                      </p>
                    </div>
                  ) : (
                    goals.map((goal) => {
                      const baseProgress =
                        (goal as any).target_points && (goal as any).target_points > 0
                          ? Math.round(
                              (((goal as any).current_points || 0) / (goal as any).target_points) *
                                100
                            )
                          : 0
                      const goalProgress =
                        localProgress[goal.id] !== undefined ? localProgress[goal.id] : baseProgress
                      const categoryColors = {
                        quick_money: '#DC2626',
                        save_money: '#059669',
                        health: '#F59E0B',
                        network_expansion: '#8B5CF6',
                        business_growth: '#10B981',
                        fires: '#EF4444',
                        good_living: '#EC4899',
                        big_vision: '#7C3AED',
                        job: '#3B82F6',
                        organization: '#6B7280',
                        tech_issues: '#F97316',
                        business_launch: '#059669',
                        future_planning: '#0EA5E9',
                        innovation: '#8B5CF6',
                        other: '#6B7280',
                      }
                      return (
                        <div
                          key={goal.id}
                          className="bg-white/50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">
                                {(goal as any).category === 'quick_money'
                                  ? '⚡'
                                  : (goal as any).category === 'save_money'
                                    ? '💳'
                                    : (goal as any).category === 'health'
                                      ? '💪'
                                      : (goal as any).category === 'network_expansion'
                                        ? '🤝'
                                        : (goal as any).category === 'business_growth'
                                          ? '📈'
                                          : (goal as any).category === 'fires'
                                            ? '🔥'
                                            : (goal as any).category === 'good_living'
                                              ? '🌟'
                                              : (goal as any).category === 'big_vision'
                                                ? '🎯'
                                                : (goal as any).category === 'job'
                                                  ? '💼'
                                                  : (goal as any).category === 'organization'
                                                    ? '📁'
                                                    : (goal as any).category === 'tech_issues'
                                                      ? '🔧'
                                                      : (goal as any).category === 'business_launch'
                                                        ? '🚀'
                                                        : (goal as any).category ===
                                                            'future_planning'
                                                          ? '🗺️'
                                                          : (goal as any).category === 'innovation'
                                                            ? '💡'
                                                            : '📋'}
                              </span>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {(goal as any).title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {(goal as any).description || 'No description'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 capitalize border-blue-200 text-blue-700">
                                {(goal as any).category}
                              </span>
                              <button
                                onClick={() => convertGoalToTask(goal)}
                                className="text-green-500 hover:text-green-700"
                                title="Convert to Task"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteGoal(goal.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete Goal"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {(goal as any).current_points || 0}/
                                {(goal as any).target_points || 0} points
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{goalProgress}%</span>
                                {updatingProgress === goal.id && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                )}
                              </div>
                            </div>

                            {/* Interactive Progress Slider */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Progress</span>
                                <span>{goalProgress}%</span>
                              </div>
                              <Slider
                                value={goalProgress}
                                onChange={(value) => handleProgressChange(goal.id, value)}
                                onValueCommit={(value) => handleProgressCommit(goal.id, value)}
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                                disabled={updatingProgress === goal.id}
                              />
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {((goal as any).target_points || 0) -
                                  ((goal as any).current_points || 0)}{' '}
                                points remaining
                              </span>
                              <button
                                onClick={() => openEditGoal(goal)}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-gray-100 hover:text-gray-900 h-9 rounded-md px-3 text-xs"
                              >
                                View Details <ChevronRight className="h-3 w-3 ml-1" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight flex items-center text-xl">
                      <CheckCircle className="h-6 w-6 mr-2 text-green-500" />
                      Current Tasks
                    </h2>
                    <p className="text-sm text-gray-600">
                      Break down your projects into actionable steps
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white hover:bg-gray-50 h-10 px-4 py-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </button>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading tasks...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">
                        No tasks yet. Create your first task to get started!
                      </p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`bg-white/50 rounded-lg p-4 border transition-all duration-200 hover:shadow-sm ${
                          task.status === 'completed'
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all duration-200 ${
                              task.status === 'completed'
                                ? 'bg-green-500 border-green-500 hover:bg-green-600'
                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            {task.status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-white" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4
                                  className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                >
                                  {(task as any).title}
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {task.description || 'No description'}
                                </p>
                                {(task as any).weekly_goal && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    📋 {(task as any).weekly_goal.title}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-100 text-gray-700">
                                  <Star className="h-3 w-3 mr-1" />
                                  {task.points_value}
                                </span>
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title="Edit Task"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    console.log(
                                      'Convert to goal button clicked for task:',
                                      (task as any).title
                                    )
                                    convertTaskToGoal(task)
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="Convert to Goal"
                                >
                                  <Target className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
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
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* AI Assistant */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <h2 className="font-semibold tracking-tight flex items-center text-xl">
                  <Brain className="h-6 w-6 mr-2 text-purple-500" />
                  AI Assistant
                </h2>
                <p className="text-sm text-gray-600">Your AI Productivity Advisor</p>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  <div className="bg-white/70 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Ready to help!</p>
                        <p className="text-xs text-gray-600">
                          Ask me anything about your strategy for the day
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setTriggerChatOpen(true)}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
                    >
                      <MessageSquare className="h-4 w-4 mr-2 inline" />
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Accomplishments */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold tracking-tight flex items-center text-xl">
                      <Activity className="h-6 w-6 mr-2 text-orange-500" />
                      Recent Accomplishments
                    </h2>
                    <p className="text-sm text-gray-600">Your latest progress and achievements</p>
                  </div>
                  <button
                    onClick={() => setShowAccomplishmentsHistory(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  {accomplishments.length === 0 ? (
                    <div className="text-center py-6">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-sm">No accomplishments yet</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Complete goals or tasks to see your progress here
                      </p>
                    </div>
                  ) : (
                    accomplishments.map((accomplishment) => {
                      const isGoalProgress = accomplishment.type === 'goal_progress'
                      const isTaskCompletion = accomplishment.type === 'task_completion'

                      const getIcon = () => {
                        if (isGoalProgress) {
                          const category = (accomplishment as any).details.goal?.category
                          return category === 'quick_money'
                            ? '⚡'
                            : category === 'save_money'
                              ? '💳'
                              : category === 'health'
                                ? '💪'
                                : category === 'network_expansion'
                                  ? '🤝'
                                  : category === 'business_growth'
                                    ? '📈'
                                    : category === 'fires'
                                      ? '🔥'
                                      : category === 'good_living'
                                        ? '🌟'
                                        : category === 'big_vision'
                                          ? '🎯'
                                          : category === 'job'
                                            ? '💼'
                                            : category === 'organization'
                                              ? '📁'
                                              : category === 'tech_issues'
                                                ? '🔧'
                                                : category === 'business_launch'
                                                  ? '🚀'
                                                  : category === 'future_planning'
                                                    ? '🗺️'
                                                    : category === 'innovation'
                                                      ? '💡'
                                                      : '📋'
                        } else if (isTaskCompletion) {
                          return '✅'
                        }
                        return '⭐'
                      }

                      const getTitle = () => {
                        if (isGoalProgress) {
                          return `Progress on "${(accomplishment as any).details.goal?.title}"`
                        } else if (isTaskCompletion) {
                          return `Completed "${(accomplishment as any).details.task?.title}"`
                        }
                        return accomplishment.description
                      }

                      const getTimeAgo = (dateString: string) => {
                        const now = new Date()
                        const date = new Date(dateString)
                        const diffInMinutes = Math.floor(
                          (now.getTime() - date.getTime()) / (1000 * 60)
                        )

                        if (diffInMinutes < 1) return 'Just now'
                        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
                        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
                        return `${Math.floor(diffInMinutes / 1440)}d ago`
                      }

                      return (
                        <div
                          key={(accomplishment as any).id}
                          className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg border border-gray-200 hover:bg-white/70 transition-colors"
                        >
                          <span className="text-lg">{getIcon()}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {getTitle() as any}
                            </p>
                            <p className="text-xs text-gray-600">
                              {getTimeAgo((accomplishment as any).created_at)}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-green-100 text-green-700">
                            <Star className="h-3 w-3 mr-1" />+{(accomplishment as any).points}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
              <div className="p-6 pb-4">
                <h2 className="font-semibold tracking-tight flex items-center text-xl">
                  <PieChart className="h-6 w-6 mr-2 text-indigo-500" />
                  Category Progress
                </h2>
                <p className="text-sm text-gray-600">Points by life area</p>
              </div>
              <div className="p-6 pt-0">
                <div className="space-y-4">
                  {Object.keys(categoryPoints).length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No projects yet</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Create your first project to see category progress
                      </p>
                    </div>
                  ) : (
                    Object.entries(categoryPoints)
                      .sort(([, a], [, b]) => b.current - a.current) // Sort by current points descending
                      .map(([category, points]) => {
                        const categoryColors = {
                          quick_money: 'bg-red-500',
                          save_money: 'bg-gray-500',
                          health: 'bg-orange-500',
                          network_expansion: 'bg-gray-600',
                          business_growth: 'bg-green-500',
                          fires: 'bg-red-600',
                          good_living: 'bg-yellow-500',
                          big_vision: 'bg-indigo-500',
                          job: 'bg-gray-500',
                          organization: 'bg-teal-500',
                          tech_issues: 'bg-cyan-500',
                          business_launch: 'bg-pink-500',
                          future_planning: 'bg-violet-500',
                          innovation: 'bg-emerald-500',
                          productivity: 'bg-green-500',
                          learning: 'bg-gray-600',
                          financial: 'bg-gray-500',
                          personal: 'bg-pink-500',
                          other: 'bg-gray-400',
                        }

                        const categoryLabels = {
                          quick_money: 'Quick Money',
                          save_money: 'Save Money',
                          health: 'Health',
                          network_expansion: 'Network Expansion',
                          business_growth: 'Business Growth',
                          fires: 'Fires',
                          good_living: 'Good Living',
                          big_vision: 'Big Vision',
                          job: 'Job',
                          organization: 'Organization',
                          tech_issues: 'Tech Issues',
                          business_launch: 'Business Launch',
                          future_planning: 'Future Planning',
                          innovation: 'Innovation',
                          productivity: 'Productivity',
                          learning: 'Learning',
                          financial: 'Financial',
                          personal: 'Personal',
                          other: 'Other',
                        }

                        return (
                          <div key={category} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-3 h-3 rounded-full ${categoryColors[category as keyof typeof categoryColors] || 'bg-gray-400'}`}
                              />
                              <span className="text-sm font-medium text-gray-900">
                                {categoryLabels[category as keyof typeof categoryLabels] ||
                                  category}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-gray-900">
                                {points.current} pts
                              </span>
                              <span className="text-xs text-gray-500 ml-1">/ {points.target}</span>
                            </div>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Daily Habits Section */}
            <HabitsSection />

            {/* Education Section */}
            <EducationSection />
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Project</h3>
              <button
                onClick={() => setShowAddGoal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter goal title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter goal description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quick_money">⚡ Quick Money</option>
                  <option value="save_money">💳 Save Money</option>
                  <option value="health">💪 Health</option>
                  <option value="network_expansion">🤝 Network Expansion</option>
                  <option value="business_growth">📈 Business Growth</option>
                  <option value="fires">🔥 Fires</option>
                  <option value="good_living">🌟 Good Living</option>
                  <option value="big_vision">🎯 Big Vision</option>
                  <option value="job">💼 Job</option>
                  <option value="organization">📁 Organization</option>
                  <option value="tech_issues">🔧 Tech Issues</option>
                  <option value="business_launch">🚀 Business Launch</option>
                  <option value="future_planning">🗺️ Future Planning</option>
                  <option value="innovation">💡 Innovation</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Points
                </label>
                <input
                  type="number"
                  value={newGoal.target_points}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target_points: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddGoal}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Add Project
                </button>
                <button
                  onClick={() => setShowAddGoal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Task</h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quick_money">⚡ Quick Money</option>
                  <option value="save_money">💳 Save Money</option>
                  <option value="health">💪 Health</option>
                  <option value="network_expansion">🤝 Network Expansion</option>
                  <option value="business_growth">📈 Business Growth</option>
                  <option value="fires">🔥 Fires</option>
                  <option value="good_living">🌟 Good Living</option>
                  <option value="big_vision">🎯 Big Vision</option>
                  <option value="job">💼 Job</option>
                  <option value="organization">📁 Organization</option>
                  <option value="tech_issues">🔧 Tech Issues</option>
                  <option value="business_launch">🚀 Business Launch</option>
                  <option value="future_planning">🗺️ Future Planning</option>
                  <option value="innovation">💡 Innovation</option>
                  <option value="productivity">🚀 Productivity</option>
                  <option value="learning">📚 Learning</option>
                  <option value="financial">💰 Financial</option>
                  <option value="personal">👤 Personal</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (Optional)
                </label>
                <select
                  value={newTask.weekly_goal_id}
                  onChange={(e) => setNewTask({ ...newTask, weekly_goal_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {(goal as any).title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  value={newTask.points_value}
                  onChange={(e) =>
                    setNewTask({ ...newTask, points_value: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddTask}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Add Task
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add High-Level Goal Modal */}
      {showAddHighLevelGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Goal</h3>
              <button
                onClick={() => setShowAddHighLevelGoal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  id="add-goal-title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter goal title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="add-goal-description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter goal description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
                <select
                  id="add-goal-type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  id="add-goal-target-value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter target value"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Unit</label>
                <input
                  type="text"
                  id="add-goal-target-unit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., points, dollars, hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level (1-5)
                </label>
                <input
                  type="number"
                  id="add-goal-priority"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="3"
                  min="1"
                  max="5"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    const title = (document.getElementById('add-goal-title') as HTMLInputElement)
                      ?.value
                    const description = (
                      document.getElementById('add-goal-description') as HTMLTextAreaElement
                    )?.value
                    const goal_type = (
                      document.getElementById('add-goal-type') as HTMLSelectElement
                    )?.value
                    const target_value = parseFloat(
                      (document.getElementById('add-goal-target-value') as HTMLInputElement)
                        ?.value || '0'
                    )
                    const target_unit = (
                      document.getElementById('add-goal-target-unit') as HTMLInputElement
                    )?.value
                    const priority_level = parseInt(
                      (document.getElementById('add-goal-priority') as HTMLInputElement)?.value ||
                        '3'
                    )

                    if (title?.trim()) {
                      try {
                        const response = await fetch('/api/goals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title,
                            description,
                            goal_type,
                            target_value,
                            target_unit,
                            priority_level,
                          }),
                        })

                        if (response.ok) {
                          await fetchDashboardData()
                          setShowAddHighLevelGoal(false)
                          // Clear form
                          ;(document.getElementById('add-goal-title') as HTMLInputElement).value =
                            ''
                          ;(
                            document.getElementById('add-goal-description') as HTMLTextAreaElement
                          ).value = ''
                          ;(
                            document.getElementById('add-goal-target-value') as HTMLInputElement
                          ).value = ''
                          ;(
                            document.getElementById('add-goal-target-unit') as HTMLInputElement
                          ).value = ''
                          ;(
                            document.getElementById('add-goal-priority') as HTMLInputElement
                          ).value = '3'
                        } else {
                          const errorData = await response.json()
                          alert(`Failed to create goal: ${errorData.error || 'Unknown error'}`)
                        }
                      } catch (error) {
                        console.error('Error creating goal:', error)
                        alert(
                          `Error creating goal: ${error instanceof Error ? error.message : 'Unknown error'}`
                        )
                      }
                    }
                  }}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Add Goal
                </button>
                <button
                  onClick={() => setShowAddHighLevelGoal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit High-Level Goal Modal */}
      {showEditHighLevelGoal && editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Goal</h3>
              <button
                onClick={() => setShowEditHighLevelGoal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  id="edit-high-level-goal-title"
                  defaultValue={editingGoal.title}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  id="edit-high-level-goal-description"
                  defaultValue={editingGoal.description || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type</label>
                <select
                  id="edit-high-level-goal-type"
                  defaultValue={(editingGoal as any).goal_type}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  id="edit-high-level-goal-target-value"
                  defaultValue={(editingGoal as any).target_value || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Unit</label>
                <input
                  type="text"
                  id="edit-high-level-goal-target-unit"
                  defaultValue={(editingGoal as any).target_unit || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Value
                </label>
                <input
                  type="number"
                  id="edit-high-level-goal-current-value"
                  defaultValue={(editingGoal as any).current_value || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level (1-5)
                </label>
                <input
                  type="number"
                  id="edit-high-level-goal-priority"
                  defaultValue={(editingGoal as any).priority_level || 3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="5"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const title = (
                      document.getElementById('edit-high-level-goal-title') as HTMLInputElement
                    )?.value
                    const description = (
                      document.getElementById(
                        'edit-high-level-goal-description'
                      ) as HTMLTextAreaElement
                    )?.value
                    const goal_type = (
                      document.getElementById('edit-high-level-goal-type') as HTMLSelectElement
                    )?.value
                    const target_value = parseFloat(
                      (
                        document.getElementById(
                          'edit-high-level-goal-target-value'
                        ) as HTMLInputElement
                      )?.value || '0'
                    )
                    const target_unit = (
                      document.getElementById(
                        'edit-high-level-goal-target-unit'
                      ) as HTMLInputElement
                    )?.value
                    const current_value = parseFloat(
                      (
                        document.getElementById(
                          'edit-high-level-goal-current-value'
                        ) as HTMLInputElement
                      )?.value || '0'
                    )
                    const priority_level = parseInt(
                      (document.getElementById('edit-high-level-goal-priority') as HTMLInputElement)
                        ?.value || '3'
                    )

                    updateHighLevelGoal({
                      title,
                      description,
                      goal_type,
                      target_value,
                      target_unit,
                      current_value,
                      priority_level,
                    })
                  }}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Update Goal
                </button>
                <button
                  onClick={() => setShowEditHighLevelGoal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {showEditGoal && editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Project</h3>
              <button
                onClick={() => setShowEditGoal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={editingGoal.title}
                  id="edit-goal-title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  defaultValue={editingGoal.description || ''}
                  id="edit-goal-description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  defaultValue={editingGoal.category}
                  id="edit-goal-category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quick_money">⚡ Quick Money</option>
                  <option value="save_money">💳 Save Money</option>
                  <option value="health">💪 Health</option>
                  <option value="network_expansion">🤝 Network Expansion</option>
                  <option value="business_growth">📈 Business Growth</option>
                  <option value="fires">🔥 Fires</option>
                  <option value="good_living">🌟 Good Living</option>
                  <option value="big_vision">🎯 Big Vision</option>
                  <option value="job">💼 Job</option>
                  <option value="organization">📁 Organization</option>
                  <option value="tech_issues">🔧 Tech Issues</option>
                  <option value="business_launch">🚀 Business Launch</option>
                  <option value="future_planning">🗺️ Future Planning</option>
                  <option value="innovation">💡 Innovation</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Points
                </label>
                <input
                  type="number"
                  defaultValue={editingGoal.target_points}
                  id="edit-goal-target-points"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Progress (%)
                </label>
                <input
                  type="number"
                  defaultValue={
                    editingGoal.target_points && editingGoal.target_points > 0
                      ? Math.round(
                          ((editingGoal.current_points || 0) / editingGoal.target_points) * 100
                        )
                      : 0
                  }
                  id="edit-goal-progress"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const title = (document.getElementById('edit-goal-title') as HTMLInputElement)
                      ?.value
                    const description = (
                      document.getElementById('edit-goal-description') as HTMLTextAreaElement
                    )?.value
                    const category = (
                      document.getElementById('edit-goal-category') as HTMLSelectElement
                    )?.value
                    const target_points = parseInt(
                      (document.getElementById('edit-goal-target-points') as HTMLInputElement)
                        ?.value || '0'
                    )
                    const progress = parseInt(
                      (document.getElementById('edit-goal-progress') as HTMLInputElement)?.value ||
                        '0'
                    )
                    const current_points = Math.round((progress / 100) * target_points)

                    updateGoal({
                      title,
                      description,
                      category,
                      target_points,
                      current_points,
                    })
                  }}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Update Project
                </button>
                <button
                  onClick={() => setShowEditGoal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Task</h3>
              <button
                onClick={() => setShowEditTask(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  defaultValue={editingTask.title}
                  id="edit-task-title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  defaultValue={editingTask.description || ''}
                  id="edit-task-description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  defaultValue={editingTask.category || 'other'}
                  id="edit-task-category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="quick_money">⚡ Quick Money</option>
                  <option value="save_money">💳 Save Money</option>
                  <option value="health">💪 Health</option>
                  <option value="network_expansion">🤝 Network Expansion</option>
                  <option value="business_growth">📈 Business Growth</option>
                  <option value="fires">🔥 Fires</option>
                  <option value="good_living">🌟 Good Living</option>
                  <option value="big_vision">🎯 Big Vision</option>
                  <option value="job">💼 Job</option>
                  <option value="organization">📁 Organization</option>
                  <option value="tech_issues">🔧 Tech Issues</option>
                  <option value="business_launch">🚀 Business Launch</option>
                  <option value="future_planning">🗺️ Future Planning</option>
                  <option value="innovation">💡 Innovation</option>
                  <option value="productivity">🚀 Productivity</option>
                  <option value="learning">📚 Learning</option>
                  <option value="financial">💰 Financial</option>
                  <option value="personal">👤 Personal</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (Optional)
                </label>
                <select
                  defaultValue={editingTask.weekly_goal_id}
                  id="edit-task-goal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a project</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {(goal as any).title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  type="number"
                  defaultValue={editingTask.points_value}
                  id="edit-task-points"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  defaultValue={editingTask.status}
                  id="edit-task-status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const title = (document.getElementById('edit-task-title') as HTMLInputElement)
                      ?.value
                    const description = (
                      document.getElementById('edit-task-description') as HTMLTextAreaElement
                    )?.value
                    const category =
                      (document.getElementById('edit-task-category') as HTMLSelectElement)?.value ||
                      'other'
                    const weekly_goal_id =
                      (document.getElementById('edit-task-goal') as HTMLSelectElement)?.value ||
                      undefined
                    const points_value = parseInt(
                      (document.getElementById('edit-task-points') as HTMLInputElement)?.value ||
                        '0'
                    )
                    const status = (
                      document.getElementById('edit-task-status') as HTMLSelectElement
                    )?.value as 'pending' | 'in_progress' | 'completed'

                    updateTask({
                      title,
                      description,
                      category,
                      weekly_goal_id: weekly_goal_id || undefined,
                      points_value,
                      status,
                    })
                  }}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Update Task
                </button>
                <button
                  onClick={() => setShowEditTask(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accomplishments History Modal */}
      {showAccomplishmentsHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Accomplishments History</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Complete history of your progress and achievements
                  </p>
                </div>
                <button
                  onClick={() => setShowAccomplishmentsHistory(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <AccomplishmentsHistory />
            </div>
          </div>
        </div>
      )}

      {/* Points Details Modal */}
      {showPointsDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Points Details & Settings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your timezone and view points history
                  </p>
                </div>
                <button
                  onClick={() => setShowPointsDetails(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Timezone Settings */}
                <div>
                  <h4 className="text-lg font-medium mb-4">Timezone Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Timezone
                      </label>
                      <select
                        value={userTimezone}
                        onChange={(e) => updateUserTimezone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                      </select>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-800">
                        <strong>Note:</strong> Your daily points reset at midnight in your selected
                        timezone. All points are still tracked in your history and contribute to
                        weekly totals.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Points History */}
                <div>
                  <h4 className="text-lg font-medium mb-4">Points History</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {pointsHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No points history yet</p>
                        <p className="text-gray-500 text-sm mt-1">
                          Complete tasks or projects to see your points history
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pointsHistory.map((entry, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white rounded border"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <p className="font-medium text-sm">{(entry as any).description}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date((entry as any).created_at).toLocaleString('en-US', {
                                    timeZone: userTimezone,
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-green-600">
                              +{(entry as any).points}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Breakdown */}
                <div>
                  <h4 className="text-lg font-medium mb-4">This Week&apos;s Daily Breakdown</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {pointsData?.dailyBreakdown?.map((day, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">{day.dayName}</p>
                        <p className="font-bold text-lg">{day.points}</p>
                        <p className="text-xs text-gray-500">{day.date}</p>
                      </div>
                    )) || (
                      <div className="col-span-7 text-center py-8 text-gray-500">
                        No daily breakdown available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <ChatInterface
        onGoalCreated={fetchDashboardData}
        onTaskCreated={fetchDashboardData}
        onTaskCompleted={fetchDashboardData}
        triggerOpen={triggerChatOpen}
      />

      {/* Manual Priority Form */}
      {showManualPriorityForm && (
        <ManualPriorityForm
          onClose={() => setShowManualPriorityForm(false)}
          onSuccess={() => {
            fetchPriorities()
            setShowManualPriorityForm(false)
          }}
        />
      )}

      {/* Conversational Priority Input */}
      {showConversationalPriorityInput && (
        <ConversationalPriorityInput
          onClose={() => setShowConversationalPriorityInput(false)}
          onSuccess={() => {
            fetchPriorities()
            setShowConversationalPriorityInput(false)
          }}
        />
      )}
    </div>
  )
}
