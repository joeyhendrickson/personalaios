'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Flame,
  Trophy,
  Lock,
  Calendar,
  Sunrise,
  Star,
  Shield,
  Crown,
  Target,
  Award,
  Medal,
  Gem,
} from 'lucide-react'

interface SigninStreakTrophy {
  id: string
  name: string
  description: string
  streak_days_required: number
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
  signin_streak_trophies: SigninStreakTrophy
}

interface StreakInfo {
  current: number
  longest: number
  total: number
}

export default function SigninStreakTrophies() {
  const [trophies, setTrophies] = useState<SigninStreakTrophy[]>([])
  const [userTrophies, setUserTrophies] = useState<UserTrophy[]>([])
  const [streak, setStreak] = useState<StreakInfo>({ current: 0, longest: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSigninStreakData()
  }, [])

  const fetchSigninStreakData = async () => {
    try {
      // TODO: Create this API endpoint
      const response = await fetch('/api/signin-streak/trophies')
      if (!response.ok) throw new Error('Failed to fetch sign-in streak data')

      const data = await response.json()
      setTrophies(data.trophies || [])
      setUserTrophies(data.userTrophies || [])
      setStreak(data.streak || { current: 0, longest: 0, total: 0 })
    } catch (error) {
      console.error('Failed to fetch sign-in streak data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isTrophyEarned = (trophyId: string) => {
    return userTrophies.some((ut) => ut.signin_streak_trophies.id === trophyId)
  }

  const getProgressToNextTrophy = (trophy: SigninStreakTrophy) => {
    return Math.min((streak.current / trophy.streak_days_required) * 100, 100)
  }

  const getNextUnearnedTrophy = () => {
    return trophies.find((trophy) => !isTrophyEarned(trophy.id))
  }

  const getTrophyIcon = (streakDays: number) => {
    // Return different icons based on streak milestone
    if (streakDays === 1) return Sunrise
    if (streakDays === 2) return Calendar
    if (streakDays === 3) return Target
    if (streakDays === 7) return Star
    if (streakDays === 14) return Shield
    if (streakDays === 30) return Crown
    if (streakDays === 90) return Trophy
    if (streakDays >= 365) return Gem
    return Medal
  }

  const nextTrophy = getNextUnearnedTrophy()

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flame className="h-5 w-5 mr-2 text-orange-500" />
            Daily Self-Awareness
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Flame className="h-5 w-5 mr-2 text-orange-500" />
          <span
            className="cursor-help border-b border-dotted border-gray-400"
            title="Keep your streak alive by signing in daily. Earn trophies for consistent daily presence!"
          >
            Daily Self-Awareness
          </span>
        </CardTitle>
        <CardDescription>Trophies Earned for Daily Login and Review</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-2xl font-bold text-orange-600">{streak.current}</div>
            <div className="text-xs text-gray-500">Current Streak</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <div className="text-2xl font-bold text-yellow-600">{streak.longest}</div>
            <div className="text-xs text-gray-500">Longest Streak</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm text-center">
            <Flame className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <div className="text-2xl font-bold text-red-600">{streak.total}</div>
            <div className="text-xs text-gray-500">Total Sign-Ins</div>
          </div>
        </div>

        {/* Next Trophy Progress */}
        {nextTrophy && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Next Trophy</span>
              <Badge variant="secondary">{nextTrophy.name}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{streak.current} day streak</span>
                <span>
                  {streak.current} / {nextTrophy.streak_days_required}
                </span>
              </div>
              <Progress value={getProgressToNextTrophy(nextTrophy)} className="h-2" />
            </div>
          </div>
        )}

        {/* Earned Trophies */}
        {userTrophies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Earned Trophies</h3>
            <div className="space-y-3">
              {userTrophies.map((userTrophy) => {
                const TrophyIcon = getTrophyIcon(
                  userTrophy.signin_streak_trophies.streak_days_required
                )
                return (
                  <div
                    key={userTrophy.id}
                    className="bg-white rounded-lg p-4 shadow-sm border-2 border-orange-200"
                    style={{
                      background: userTrophy.signin_streak_trophies.background_gradient,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: userTrophy.signin_streak_trophies.color + '40' }}
                      >
                        <TrophyIcon
                          className="h-6 w-6"
                          style={{ color: userTrophy.signin_streak_trophies.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {userTrophy.signin_streak_trophies.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {userTrophy.signin_streak_trophies.description}
                        </p>
                        <p className="text-xs italic text-gray-500 mt-2">
                          "{userTrophy.signin_streak_trophies.reflection_message}"
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            {userTrophy.signin_streak_trophies.streak_days_required} day streak
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(userTrophy.earned_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
                                {streak.current} / {trophy.streak_days_required} days
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
