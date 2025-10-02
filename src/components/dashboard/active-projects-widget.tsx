'use client'

import React, { useState, useEffect } from 'react'
import { Target, Lightbulb, RotateCcw, TrendingUp } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface ProjectData {
  overallCompletionRate: number
  totalProjects: number
  totalTasks: number
}

interface StrategicRecommendation {
  recommendation: string
  focusArea: string
  completionRate: number
  taskCompletionRate: number
  timestamp: string
}

interface ActiveProjectsWidgetProps {
  goals: Record<string, unknown>[]
}

export default function ActiveProjectsWidget({ goals }: ActiveProjectsWidgetProps) {
  const { user } = useAuth()
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [strategicRecommendation, setStrategicRecommendation] =
    useState<StrategicRecommendation | null>(null)
  const [strategicLoading, setStrategicLoading] = useState(false)

  useEffect(() => {
    fetchProjectRecommendations()
    if (user) {
      fetchStrategicRecommendations()
    }
  }, [goals, user])

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

  const fetchStrategicRecommendations = async () => {
    try {
      setStrategicLoading(true)
      console.log('Fetching strategic recommendations...')
      // Add cache-busting parameter to ensure fresh recommendations
      const timestamp = Date.now()
      const response = await fetch(
        `/api/projects/strategic-completion-recommendations-simple?t=${timestamp}`
      )
      console.log('Strategic recommendations response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Strategic recommendations data received:', data)
        setStrategicRecommendation(data)
      } else {
        // Handle different error types
        if (response.status === 401) {
          console.log('User not authenticated, skipping strategic recommendations')
          setStrategicRecommendation(null)
        } else {
          try {
            const errorData = await response.json()
            console.error('Failed to fetch strategic recommendations:', errorData)
          } catch (parseError) {
            console.error(
              'Failed to fetch strategic recommendations - response not JSON:',
              response.status,
              response.statusText
            )
          }
        }
      }
    } catch (error) {
      console.error('Error fetching strategic recommendations:', error)
      // Don't set loading to false here if it's a network error, let it retry
    } finally {
      setStrategicLoading(false)
    }
  }

  const handleRefreshStrategicRecommendations = () => {
    if (user) {
      fetchStrategicRecommendations()
    } else {
      console.log('Cannot refresh strategic recommendations - user not authenticated')
    }
  }

  // Calculate radial progress
  const completionRate = projectData?.overallCompletionRate || 0
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (completionRate / 100) * circumference

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-black">Project Recommendations</p>
            <p className="text-2xl font-bold text-black">{goals.length}</p>
          </div>

          {/* Enhanced Radial with Progress */}
          <div className="relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" stroke="#E5E7EB" strokeWidth="8" fill="none" />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#60A5FA"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-in-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-sm font-bold text-black">{completionRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h4 className="text-sm font-semibold text-gray-800">Strategic Insights</h4>
            </div>
            <button
              onClick={handleRefreshStrategicRecommendations}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh strategic recommendations"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {strategicLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Analyzing your projects...</p>
            </div>
          ) : strategicRecommendation ? (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-400 rounded-full p-2 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      {strategicRecommendation.focusArea}
                    </span>
                    <span className="text-xs text-gray-500">
                      {strategicRecommendation.completionRate}% project completion
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {strategicRecommendation.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Lightbulb className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No strategic insights available</p>
              <p className="text-xs text-gray-400 mt-1">Click refresh to generate insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
