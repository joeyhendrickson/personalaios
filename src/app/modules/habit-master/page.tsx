'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Target,
  TrendingUp,
  Users,
  Award,
  Brain,
  Heart,
  Activity,
  BookOpen,
  DollarSign,
  Smartphone,
  Star,
  Zap,
  CheckCircle,
  X,
  Calendar,
  BarChart3,
  Trophy,
  MessageCircle,
  Bell,
  Filter,
  Search,
  Clock,
  Flame,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  ThumbsUp,
  Share2,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HabitCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
}

interface Habit {
  id: string
  title: string
  description: string
  category_id: string
  habit_type: 'positive' | 'negative'
  cue_description: string
  craving_description: string
  response_description: string
  reward_description: string
  if_then_plan: string
  personal_value: string
  committed_action: string
  is_keystone: boolean
  keystone_impact: string
  automatic_thought: string
  cognitive_distortion: string
  reframe_statement: string
  stage_of_change: 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance'
  autonomy_score: number
  competence_score: number
  relatedness_score: number
  points_per_completion: number
  difficulty_level: 'easy' | 'medium' | 'hard'
  is_public: boolean
  share_achievements: boolean
  category?: HabitCategory
  current_streak: number
  longest_streak: number
  completion_rate: number
}

interface HabitCompletion {
  id: string
  habit_id: string
  completion_date: string
  notes: string
  automatic_thought: string
  emotion_before: string
  emotion_after: string
  cognitive_reframe: string
  autonomy_feeling: number
  competence_feeling: number
  relatedness_feeling: number
  if_then_applied: boolean
  if_then_effectiveness: number
  points_earned: number
}

interface SocialCelebration {
  id: string
  celebrator_name: string
  celebrated_user_name: string
  habit_title: string
  celebration_type: 'streak' | 'milestone' | 'completion' | 'challenge_win'
  message: string
  created_at: string
}

interface TopPerformer {
  user_name: string
  total_completions: number
  current_streak: number
  category: string
}

export default function HabitMasterPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [categories, setCategories] = useState<HabitCategory[]>([])
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [socialCelebrations, setSocialCelebrations] = useState<SocialCelebration[]>([])
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedHabitType, setSelectedHabitType] = useState<string>('all')
  const [showSocial, setShowSocial] = useState(true)
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    category_id: '',
    habit_type: 'positive' as 'positive' | 'negative',
    cue_description: '',
    craving_description: '',
    response_description: '',
    reward_description: '',
    if_then_plan: '',
    personal_value: '',
    committed_action: '',
    is_keystone: false,
    keystone_impact: '',
    automatic_thought: '',
    cognitive_distortion: '',
    reframe_statement: '',
    stage_of_change: 'precontemplation' as
      | 'precontemplation'
      | 'contemplation'
      | 'preparation'
      | 'action'
      | 'maintenance',
    autonomy_score: 5,
    competence_score: 5,
    relatedness_score: 5,
    points_per_completion: 10,
    difficulty_level: 'medium' as 'easy' | 'medium' | 'hard',
    is_public: false,
    share_achievements: true,
  })

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'activity':
        return <Activity className="h-5 w-5" />
      case 'brain':
        return <Brain className="h-5 w-5" />
      case 'target':
        return <Target className="h-5 w-5" />
      case 'users':
        return <Users className="h-5 w-5" />
      case 'book-open':
        return <BookOpen className="h-5 w-5" />
      case 'dollar-sign':
        return <DollarSign className="h-5 w-5" />
      case 'heart':
        return <Heart className="h-5 w-5" />
      case 'smartphone':
        return <Smartphone className="h-5 w-5" />
      default:
        return <Star className="h-5 w-5" />
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'precontemplation':
        return 'bg-gray-100 text-gray-800'
      case 'contemplation':
        return 'bg-yellow-100 text-yellow-800'
      case 'preparation':
        return 'bg-blue-100 text-blue-800'
      case 'action':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    fetchHabits()
    fetchCategories()
    fetchSocialData()
  }, [])

  const fetchHabits = async () => {
    try {
      const response = await fetch('/api/habit-master/habits')
      if (response.ok) {
        const data = await response.json()
        setHabits(data)
      }
    } catch (error) {
      console.error('Error fetching habits:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/habit-master/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchSocialData = async () => {
    try {
      const [celebrationsResponse, performersResponse] = await Promise.all([
        fetch('/api/habit-master/celebrations'),
        fetch('/api/habit-master/top-performers'),
      ])

      if (celebrationsResponse.ok) {
        const celebrationsData = await celebrationsResponse.json()
        setSocialCelebrations(celebrationsData)
      }

      if (performersResponse.ok) {
        const performersData = await performersResponse.json()
        setTopPerformers(performersData)
      }
    } catch (error) {
      console.error('Error fetching social data:', error)
    }
  }

  const handleAddHabit = async () => {
    try {
      const response = await fetch('/api/habit-master/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit),
      })

      if (response.ok) {
        setShowAddHabit(false)
        setNewHabit({
          title: '',
          description: '',
          category_id: '',
          habit_type: 'positive',
          cue_description: '',
          craving_description: '',
          response_description: '',
          reward_description: '',
          if_then_plan: '',
          personal_value: '',
          committed_action: '',
          is_keystone: false,
          keystone_impact: '',
          automatic_thought: '',
          cognitive_distortion: '',
          reframe_statement: '',
          stage_of_change: 'precontemplation',
          autonomy_score: 5,
          competence_score: 5,
          relatedness_score: 5,
          points_per_completion: 10,
          difficulty_level: 'medium',
          is_public: false,
          share_achievements: true,
        })
        fetchHabits()
      }
    } catch (error) {
      console.error('Error adding habit:', error)
    }
  }

  const handleCompleteHabit = async (habitId: string) => {
    try {
      const response = await fetch('/api/habit-master/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId }),
      })

      if (response.ok) {
        fetchHabits()
        fetchSocialData()

        // Show success notification
        const habit = habits.find((h) => h.id === habitId)
        if (habit) {
          alert(
            `Great job! You completed "${habit.title}" and earned ${habit.points_per_completion} points!`
          )
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to complete habit')
      }
    } catch (error) {
      console.error('Error completing habit:', error)
      alert('Failed to complete habit. Please try again.')
    }
  }

  const generateAIInsights = async (habitId: string) => {
    try {
      const response = await fetch('/api/habit-master/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId }),
      })

      if (response.ok) {
        const insights = await response.json()
        // You could show these insights in a modal or separate page
        console.log('AI Insights:', insights)
        alert('AI insights generated! Check the console for details.')
      } else {
        alert('Failed to generate AI insights')
      }
    } catch (error) {
      console.error('Error generating AI insights:', error)
      alert('Failed to generate AI insights')
    }
  }

  const filteredHabits = habits.filter((habit) => {
    const categoryMatch = selectedCategory === 'all' || habit.category_id === selectedCategory
    const typeMatch = selectedHabitType === 'all' || habit.habit_type === selectedHabitType
    return categoryMatch && typeMatch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading Habit Master...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/modules">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Life Hacks
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Star className="h-8 w-8 mr-3 text-orange-600" />
                  Habit Master
                </h1>
                <p className="text-sm text-gray-600">
                  Build positive habits and break negative ones using psychological frameworks
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowSocial(!showSocial)}
                variant="outline"
                className={showSocial ? 'bg-blue-50 border-blue-200' : ''}
              >
                {showSocial ? (
                  <Eye className="h-4 w-4 mr-2" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                {showSocial ? 'Hide Social' : 'Show Social'}
              </Button>
              <Button
                onClick={() => setShowAddHabit(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Habit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedHabitType}
                    onChange={(e) => setSelectedHabitType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="positive">Positive Habits</option>
                    <option value="negative">Breaking Habits</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: habit.category?.color + '20' }}
                      >
                        {habit.category && getCategoryIcon(habit.category.icon)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          {habit.title}
                          {habit.is_keystone && (
                            <Sparkles className="h-4 w-4 ml-2 text-yellow-500" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{habit.category?.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(habit.difficulty_level)}`}
                      >
                        {habit.difficulty_level}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(habit.stage_of_change)}`}
                      >
                        {habit.stage_of_change}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{habit.description}</p>

                  {/* Habit Loop (Atomic Habits Framework) */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Habit Loop</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="font-medium">Cue:</span> {habit.cue_description}
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="font-medium">Reward:</span> {habit.reward_description}
                      </div>
                    </div>
                  </div>

                  {/* Implementation Intention */}
                  {habit.if_then_plan && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">If-Then Plan</h4>
                      <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">
                        {habit.if_then_plan}
                      </p>
                    </div>
                  )}

                  {/* Streak and Stats */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">
                          {habit.current_streak} day streak
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">Best: {habit.longest_streak}</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {habit.points_per_completion} pts
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleCompleteHabit(habit.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Today
                    </Button>
                    <Button
                      onClick={() => generateAIInsights(habit.id)}
                      variant="outline"
                      size="sm"
                      className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredHabits.length === 0 && (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No habits found</h3>
                <p className="text-gray-500">Add your first habit to get started on your journey</p>
              </div>
            )}
          </div>

          {/* Social Sidebar */}
          {showSocial && (
            <div className="space-y-6">
              {/* Social Celebrations */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Bell className="h-5 w-5 mr-2 text-blue-600" />
                  Community Celebrations
                </h3>
                <div className="space-y-3">
                  {socialCelebrations.slice(0, 5).map((celebration) => (
                    <div
                      key={celebration.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-start space-x-2">
                        <ThumbsUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-800">
                            <span className="font-medium">{celebration.celebrator_name}</span>{' '}
                            celebrated{' '}
                            <span className="font-medium">{celebration.celebrated_user_name}</span>
                            's {celebration.habit_title} achievement!
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(celebration.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {socialCelebrations.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No recent celebrations</p>
                  )}
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {topPerformers.slice(0, 5).map((performer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-yellow-700">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{performer.user_name}</p>
                          <p className="text-xs text-gray-600">{performer.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-yellow-700">
                          {performer.current_streak} day streak
                        </p>
                        <p className="text-xs text-gray-600">
                          {performer.total_completions} completions
                        </p>
                      </div>
                    </div>
                  ))}
                  {topPerformers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No top performers yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Habit Modal */}
      {showAddHabit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add New Habit</h2>
                <Button onClick={() => setShowAddHabit(false)} variant="outline" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Habit Title
                  </label>
                  <input
                    type="text"
                    value={newHabit.title}
                    onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Morning Meditation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Describe your habit..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newHabit.category_id}
                      onChange={(e) => setNewHabit({ ...newHabit, category_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Habit Type
                    </label>
                    <select
                      value={newHabit.habit_type}
                      onChange={(e) =>
                        setNewHabit({
                          ...newHabit,
                          habit_type: e.target.value as 'positive' | 'negative',
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="positive">Positive Habit (Building)</option>
                      <option value="negative">Negative Habit (Breaking)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    If-Then Plan (Implementation Intention)
                  </label>
                  <input
                    type="text"
                    value={newHabit.if_then_plan}
                    onChange={(e) => setNewHabit({ ...newHabit, if_then_plan: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="If [cue], then I will [action]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Value (ACT Framework)
                  </label>
                  <input
                    type="text"
                    value={newHabit.personal_value}
                    onChange={(e) => setNewHabit({ ...newHabit, personal_value: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="What value does this habit align with?"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="keystone"
                    checked={newHabit.is_keystone}
                    onChange={(e) => setNewHabit({ ...newHabit, is_keystone: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="keystone" className="text-sm font-medium text-gray-700">
                    Keystone Habit (triggers positive changes in other areas)
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button onClick={() => setShowAddHabit(false)} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddHabit}
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={!newHabit.title || !newHabit.category_id}
                  >
                    Add Habit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
