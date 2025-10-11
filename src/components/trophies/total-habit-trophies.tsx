'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Award,
  Lock,
  Sparkles,
  Hammer,
  Target,
  Briefcase,
  Medal,
  Crown,
  Flame,
  Star,
  Gem,
  Zap,
} from 'lucide-react'

interface TotalHabitTrophy {
  id: string
  name: string
  description: string
  total_completions_required: number
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
  total_completions_at_time: number
  total_habit_trophies: TotalHabitTrophy
}

export default function TotalHabitTrophies() {
  const [trophies, setTrophies] = useState<TotalHabitTrophy[]>([])
  const [userTrophies, setUserTrophies] = useState<UserTrophy[]>([])
  const [totalCompletions, setTotalCompletions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTotalHabitData()
  }, [])

  const fetchTotalHabitData = async () => {
    try {
      const response = await fetch('/api/total-habit-trophies')
      if (!response.ok) throw new Error('Failed to fetch total habit trophy data')

      const data = await response.json()
      setTrophies(data.trophies || [])
      setUserTrophies(data.userTrophies || [])
      setTotalCompletions(data.totalCompletions || 0)

      console.log('Total habit trophies frontend data:', {
        trophiesCount: data.trophies?.length || 0,
        userTrophiesCount: data.userTrophies?.length || 0,
        totalCompletions: data.totalCompletions,
        trophies: data.trophies,
        userTrophies: data.userTrophies,
      })
    } catch (error) {
      console.error('Failed to fetch total habit trophy data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isTrophyEarned = (trophyId: string) => {
    return userTrophies.some((ut) => ut.total_habit_trophies.id === trophyId)
  }

  const getProgressToNextTrophy = (trophy: TotalHabitTrophy) => {
    return Math.min((totalCompletions / trophy.total_completions_required) * 100, 100)
  }

  const getNextUnearnedTrophy = () => {
    return trophies.find((trophy) => !isTrophyEarned(trophy.id))
  }

  const getTrophyIcon = (completions: number) => {
    // Return different icons based on completion milestone
    if (completions === 1) return Sparkles
    if (completions === 5) return Hammer
    if (completions === 10) return Target
    if (completions === 25) return Briefcase
    if (completions === 50) return Medal
    if (completions === 100) return Award
    if (completions === 250) return Flame
    if (completions === 500) return Crown
    if (completions === 1000) return Star
    if (completions >= 2000) return Gem
    return Zap
  }

  const nextTrophy = getNextUnearnedTrophy()

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-purple-500" />
            Habit Mastery
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2 text-purple-500" />
          <span
            className="cursor-help border-b border-dotted border-gray-400"
            title="As you complete habits across all your daily habits, you'll earn cumulative achievement trophies. This tracks your total habit completions and rewards your overall consistency."
          >
            Habit Mastery
          </span>
        </CardTitle>
        <CardDescription>Trophies earned for cumulative habit completions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Completions Counter */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Habit Completions</span>
            <Badge variant="secondary" className="text-lg font-bold">
              {totalCompletions}
            </Badge>
          </div>
          {nextTrophy && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Next: {nextTrophy.name}</span>
                <span>
                  {totalCompletions} / {nextTrophy.total_completions_required}
                </span>
              </div>
              <Progress value={getProgressToNextTrophy(nextTrophy)} className="h-2" />
            </div>
          )}
        </div>

        {/* Earned Trophies */}
        {userTrophies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Earned Trophies</h3>
            <div className="space-y-3">
              {userTrophies.map((userTrophy) => (
                <div
                  key={userTrophy.id}
                  className="bg-white rounded-lg p-4 shadow-sm border-2"
                  style={{ borderColor: userTrophy.total_habit_trophies.color + '40' }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="p-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: userTrophy.total_habit_trophies.color + '20',
                        border: `2px solid ${userTrophy.total_habit_trophies.color}40`,
                      }}
                    >
                      <Trophy
                        className="h-6 w-6"
                        style={{ color: userTrophy.total_habit_trophies.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {userTrophy.total_habit_trophies.name}
                      </h4>
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                        {userTrophy.total_habit_trophies.description}
                      </p>
                      <p className="text-sm italic text-gray-600 mt-2 leading-relaxed">
                        "{userTrophy.total_habit_trophies.reflection_message}"
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                          style={{
                            borderColor: userTrophy.total_habit_trophies.color,
                            color: userTrophy.total_habit_trophies.color,
                          }}
                        >
                          Earned at {userTrophy.total_completions_at_time} completions
                        </Badge>
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(userTrophy.earned_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Trophies */}
        {trophies.filter((trophy) => !isTrophyEarned(trophy.id)).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming Trophies</h3>
            <div className="space-y-3">
              {trophies
                .filter((trophy) => !isTrophyEarned(trophy.id))
                .slice(0, 3)
                .map((trophy) => {
                  const progress = getProgressToNextTrophy(trophy)
                  return (
                    <div
                      key={trophy.id}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 opacity-75"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-700">{trophy.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{trophy.description}</p>
                          <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Progress</span>
                              <span>
                                {totalCompletions} / {trophy.total_completions_required}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
