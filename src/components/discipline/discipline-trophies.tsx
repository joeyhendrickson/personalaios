'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Flame,
  Eye,
  TreePine,
  Circle,
  Mountain,
  Waves,
  Sun,
  Flower2,
  Trophy,
  Star,
} from 'lucide-react'

interface DisciplineTrophy {
  id: string
  name: string
  description: string
  habit_count_required: number
  essence_description: string
  reflection_message: string
  icon_name: string
  color: string
  background_gradient: string
  sound_cue: string
}

interface UserTrophy {
  id: string
  earned_at: string
  discipline_trophies: DisciplineTrophy
  daily_habits: {
    title: string
  }
}

interface CompletionCount {
  id: string
  habit_id: string
  completion_count: number
  last_completed_at: string
  daily_habits: {
    title: string
  }
}

const iconMap = {
  Candle: Flame,
  Eye,
  TreePine,
  Circle,
  Mountain,
  Wave: Waves,
  Sun,
  Lotus: Flower2,
}

export default function DisciplineTrophies() {
  const [trophies, setTrophies] = useState<DisciplineTrophy[]>([])
  const [userTrophies, setUserTrophies] = useState<UserTrophy[]>([])
  const [completionCounts, setCompletionCounts] = useState<CompletionCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDisciplineData()
  }, [])

  const fetchDisciplineData = async () => {
    try {
      const response = await fetch('/api/discipline-trophies')
      if (!response.ok) throw new Error('Failed to fetch discipline data')

      const data = await response.json()
      setTrophies(data.trophies || [])
      setUserTrophies(data.userTrophies || [])
      setCompletionCounts(data.completionCounts || [])
    } catch (error) {
      console.error('Error fetching discipline data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Trophy
    return IconComponent
  }

  const getTrophyProgress = (trophy: DisciplineTrophy, habitId: string) => {
    const completion = completionCounts.find((c) => c.habit_id === habitId)
    if (!completion) return 0
    return Math.min((completion.completion_count / trophy.habit_count_required) * 100, 100)
  }

  const isTrophyEarned = (trophyId: string, habitId: string) => {
    return userTrophies.some(
      (ut) => ut.discipline_trophies.id === trophyId && ut.habit_id === habitId
    )
  }

  const getEarnedTrophiesForHabit = (habitId: string) => {
    return userTrophies.filter((ut) => ut.habit_id === habitId)
  }

  const getUniqueHabits = () => {
    const habitIds = new Set([
      ...completionCounts.map((c) => c.habit_id),
      ...userTrophies.map((ut) => ut.habit_id),
    ])
    return Array.from(habitIds)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            The Path of The Disciplined Spirit
          </CardTitle>
          <CardDescription>
            Your journey through the stages of discipline. Each day, your habit completion brings
            you closer to mastery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your discipline journey...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          The Path of The Disciplined Spirit
        </CardTitle>
        <CardDescription>
          Your journey through the stages of discipline. Each day, your habit completion brings you
          closer to mastery.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {getUniqueHabits().length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No habits tracked yet</p>
            <p className="text-sm text-gray-500">
              Complete your daily habits to begin your journey on The Path of The Disciplined Spirit
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {getUniqueHabits().map((habitId) => {
              const habitName =
                completionCounts.find((c) => c.habit_id === habitId)?.daily_habits.title ||
                userTrophies.find((ut) => ut.habit_id === habitId)?.daily_habits.title ||
                'Unknown Habit'
              const earnedTrophies = getEarnedTrophiesForHabit(habitId)
              const completion = completionCounts.find((c) => c.habit_id === habitId)
              const currentCount = completion?.completion_count || 0

              return (
                <div
                  key={habitId}
                  className="border rounded-lg p-6 bg-gradient-to-r from-gray-50 to-blue-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{habitName}</h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {currentCount} completions
                    </Badge>
                  </div>

                  {/* Progress to next trophy */}
                  {(() => {
                    const nextTrophy = trophies.find(
                      (t) => t.habit_count_required > currentCount && !isTrophyEarned(t.id, habitId)
                    )

                    if (!nextTrophy) {
                      return (
                        <div className="text-center py-4">
                          <div className="flex items-center justify-center mb-2">
                            <Star className="h-6 w-6 text-yellow-500 mr-2" />
                            <span className="text-sm font-medium text-yellow-700">
                              All trophies earned for this habit!
                            </span>
                          </div>
                        </div>
                      )
                    }

                    const progress = getTrophyProgress(nextTrophy, habitId)
                    const remaining = nextTrophy.habit_count_required - currentCount

                    return (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Progress to: {nextTrophy.name}
                          </span>
                          <span className="text-sm text-gray-500">{remaining} more to go</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )
                  })()}

                  {/* Trophy display */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {trophies.map((trophy) => {
                      const IconComponent = getIconComponent(trophy.icon_name)
                      const isEarned = isTrophyEarned(trophy.id, habitId)
                      const progress = getTrophyProgress(trophy, habitId)

                      return (
                        <div
                          key={trophy.id}
                          className={`relative p-4 rounded-lg border-2 transition-all duration-300 ${
                            isEarned
                              ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg'
                              : progress > 0
                                ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100'
                                : 'border-gray-200 bg-gray-50 opacity-60'
                          }`}
                          style={{
                            background: isEarned ? trophy.background_gradient : undefined,
                          }}
                        >
                          <div className="text-center">
                            <div
                              className={`mx-auto mb-2 ${isEarned ? 'text-yellow-600' : 'text-gray-400'}`}
                            >
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <h4
                              className={`text-xs font-medium mb-1 ${
                                isEarned ? 'text-yellow-800' : 'text-gray-600'
                              }`}
                            >
                              {trophy.name}
                            </h4>
                            <p
                              className={`text-xs ${
                                isEarned ? 'text-yellow-700' : 'text-gray-500'
                              }`}
                            >
                              {trophy.habit_count_required} completions
                            </p>
                            {isEarned && (
                              <div className="mt-2">
                                <Badge
                                  variant="secondary"
                                  className="bg-yellow-200 text-yellow-800 text-xs"
                                >
                                  Earned
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Reflection messages for earned trophies */}
                  {earnedTrophies.length > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-3">Wisdom Gained</h4>
                      <div className="space-y-2">
                        {earnedTrophies.map((earnedTrophy) => (
                          <div key={earnedTrophy.id} className="text-sm">
                            <p className="font-medium text-yellow-700">
                              {earnedTrophy.discipline_trophies.name}:
                            </p>
                            <p className="text-yellow-600 italic">
                              "{earnedTrophy.discipline_trophies.reflection_message}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
