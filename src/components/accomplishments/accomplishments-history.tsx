'use client'

import { useState, useEffect } from 'react'
import { Star, Calendar, TrendingUp, Target, CheckCircle } from 'lucide-react'

interface Accomplishment {
  id: string
  type: 'goal_progress' | 'task_completion' | 'other'
  points: number
  description: string
  created_at: string
  details: {
    goal?: {
      id: string
      title: string
      category: string
    } | null
    task?: {
      id: string
      title: string
      status: string
    } | null
  }
}

interface AccomplishmentsSummary {
  totalPoints: number
  todayPoints: number
  thisWeekPoints: number
  totalAccomplishments: number
}

export function AccomplishmentsHistory() {
  const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([])
  const [summary, setSummary] = useState<AccomplishmentsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    fetchAccomplishments()
  }, [filter])

  const fetchAccomplishments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/accomplishments?type=all`)
      if (response.ok) {
        const data = await response.json()
        setAccomplishments(data.accomplishments || [])
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching accomplishments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAccomplishments = () => {
    if (!accomplishments.length) return []
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    return accomplishments.filter(acc => {
      const accDate = new Date(acc.created_at)
      
      switch (filter) {
        case 'today':
          return accDate >= today
        case 'week':
          return accDate >= weekStart
        case 'month':
          return accDate >= monthStart
        default:
          return true
      }
    })
  }

  const getIcon = (accomplishment: Accomplishment) => {
    const isGoalProgress = accomplishment.type === 'goal_progress'
    const isTaskCompletion = accomplishment.type === 'task_completion'
    
    if (isGoalProgress) {
      const category = accomplishment.details.goal?.category
      return category === 'quick_money' ? '⚡' : 
             category === 'save_money' ? '💳' : 
             category === 'health' ? '💪' : 
             category === 'network_expansion' ? '🤝' : 
             category === 'business_growth' ? '📈' : 
             category === 'fires' ? '🔥' : 
             category === 'good_living' ? '🌟' : 
             category === 'big_vision' ? '🎯' : 
             category === 'job' ? '💼' : 
             category === 'organization' ? '📁' : 
             category === 'tech_issues' ? '🔧' : 
             category === 'business_launch' ? '🚀' : 
             category === 'future_planning' ? '🗺️' : 
             category === 'innovation' ? '💡' : '📋'
    } else if (isTaskCompletion) {
      return '✅'
    }
    return '⭐'
  }

  const getTitle = (accomplishment: Accomplishment) => {
    const isGoalProgress = accomplishment.type === 'goal_progress'
    const isTaskCompletion = accomplishment.type === 'task_completion'
    
    if (isGoalProgress) {
      return `Progress on "${accomplishment.details.goal?.title}"`
    } else if (isTaskCompletion) {
      return `Completed "${accomplishment.details.task?.title}"`
    }
    return accomplishment.description
  }

  const getTypeLabel = (accomplishment: Accomplishment) => {
    const isGoalProgress = accomplishment.type === 'goal_progress'
    const isTaskCompletion = accomplishment.type === 'task_completion'
    
    if (isGoalProgress) {
      return 'Goal Progress'
    } else if (isTaskCompletion) {
      return 'Task Completion'
    }
    return 'Other'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAccomplishments = getFilteredAccomplishments()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Points</p>
                <p className="text-2xl font-bold text-blue-900">{summary.totalPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Today</p>
                <p className="text-2xl font-bold text-green-900">{summary.todayPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">This Week</p>
                <p className="text-2xl font-bold text-purple-900">{summary.thisWeekPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Achievements</p>
                <p className="text-2xl font-bold text-orange-900">{summary.totalAccomplishments}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        {[
          { key: 'all', label: 'All Time' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
          { key: 'month', label: 'This Month' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Accomplishments List */}
      <div className="space-y-3">
        {filteredAccomplishments.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accomplishments found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "Start completing goals and tasks to see your accomplishments here!"
                : `No accomplishments found for ${filter === 'today' ? 'today' : filter === 'week' ? 'this week' : 'this month'}.`
              }
            </p>
          </div>
        ) : (
          filteredAccomplishments.map((accomplishment) => (
            <div key={accomplishment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">{getIcon(accomplishment)}</span>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{getTitle(accomplishment)}</h4>
                      <p className="text-sm text-gray-600 mt-1">{accomplishment.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-3 py-1 text-sm font-medium">
                        <Star className="h-4 w-4 mr-1" />
                        +{accomplishment.points}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="inline-flex items-center">
                        <Target className="h-4 w-4 mr-1" />
                        {getTypeLabel(accomplishment)}
                      </span>
                      <span className="inline-flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(accomplishment.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
