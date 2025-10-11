'use client'

import React, { useState, useEffect } from 'react'
import { Target, TrendingUp, CheckCircle, Lightbulb, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface ProjectRecommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  impact: 'quick_win' | 'high_impact' | 'strategic'
  estimated_time: string
}

interface ProjectData {
  overallCompletionRate: number
  totalProjects: number
  totalTasks: number
  recommendations: ProjectRecommendation[]
}

interface TaskAdvisorProps {
  goals: Record<string, unknown>[]
}

export default function TaskAdvisor({ goals }: TaskAdvisorProps) {
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    fetchProjectRecommendations()
  }, [goals])

  const fetchProjectRecommendations = async () => {
    try {
      setLoading(true)
      // Add cache-busting parameter to ensure fresh recommendations
      const timestamp = Date.now()
      const response = await fetch(`/api/projects/recommendations?t=${timestamp}`)
      if (response.ok) {
        const data = await response.json()
        setProjectData(data)
      } else {
        console.error('Failed to fetch project recommendations')
      }
    } catch (error) {
      console.error('Error fetching project recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToTasks = async (recommendation: ProjectRecommendation) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: recommendation.title,
          description: recommendation.description,
          category: 'other', // Default category
          points_value:
            recommendation.priority === 'high' ? 10 : recommendation.priority === 'medium' ? 5 : 3,
          money_value: 0,
        }),
      })

      if (response.ok) {
        alert('Task added successfully!')
        // Optionally refresh the page or update the UI
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(`Failed to add task: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding task:', error)
      alert(`Error adding task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRefreshRecommendations = () => {
    fetchProjectRecommendations()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'quick_win':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'high_impact':
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case 'strategic':
        return <Target className="h-4 w-4 text-purple-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />
    }
  }

  const getImpactLabel = (impact: string) => {
    switch (impact) {
      case 'quick_win':
        return t('taskAdvisor.quickWin')
      case 'high_impact':
        return t('taskAdvisor.highImpact')
      case 'strategic':
        return t('taskAdvisor.strategic')
      default:
        return t('taskAdvisor.general')
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">{t('taskAdvisor.loading')}</p>
        </div>
      ) : projectData?.recommendations ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">{t('taskAdvisor.title')}</h4>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Target className="h-3 w-3" />
                <span>{t('taskAdvisor.basedOn')}</span>
              </div>
              <button
                onClick={handleRefreshRecommendations}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title={t('taskAdvisor.refresh')}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          {projectData.recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getImpactIcon(rec.impact)}
                  <span className="text-sm font-medium text-gray-800">{rec.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}
                  >
                    {rec.priority}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {rec.estimated_time}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  {getImpactLabel(rec.impact)}
                </span>
                <button
                  onClick={() => handleAddToTasks(rec)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  {t('taskAdvisor.addToTasks')} →
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="text-center py-4">
          <Lightbulb className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('taskAdvisor.noRecommendations')}</p>
        </div>
      )}
    </div>
  )
}
