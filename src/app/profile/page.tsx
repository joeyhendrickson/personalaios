'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/auth-context'
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  BarChart3,
  Target,
  CheckCircle,
  Zap,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RewardsSection from '@/components/rewards/rewards-section'
import DisciplineTrophies from '@/components/discipline/discipline-trophies'
import TotalHabitTrophies from '@/components/trophies/total-habit-trophies'
import SigninStreakTrophies from '@/components/trophies/signin-streak-trophies'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalGoals: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalPoints: 0,
  })
  const [loading, setLoading] = useState(true)

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    general: '',
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchUserStats()
  }, [user, router])

  const fetchUserStats = async () => {
    try {
      const supabase = createClient()

      // Fetch goals count
      const { count: goalsCount } = await supabase
        .from('weekly_goals')
        .select('*', { count: 'exact', head: true })

      // Fetch tasks count
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })

      // Fetch completed tasks count
      const { count: completedTasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Fetch total points
      const { data: pointsData } = await supabase
        .from('points_ledger')
        .select('points')
        .eq('user_id', user?.id)

      const totalPoints = pointsData?.reduce((sum, entry) => sum + (entry.points || 0), 0) || 0

      setStats({
        totalGoals: goalsCount || 0,
        totalTasks: tasksCount || 0,
        completedTasks: completedTasksCount || 0,
        totalPoints,
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    })

    // Validate form
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    }

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required'
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required'
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters long'
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      setPasswordErrors(errors)
      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      // Success - reset form and hide
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordChange(false)
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        general: 'Password changed successfully!',
      })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordErrors({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          general: '',
        })
      }, 3000)
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        general: error.message || 'An error occurred while changing your password',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const completionRate =
    stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Profile</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Manage your account and view your productivity statistics
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Top Row - User Info and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Info Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                      className="w-full"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>

                    <Button variant="outline" onClick={() => signOut()} className="w-full">
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Change Form */}
              {showPasswordChange && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="h-5 w-5 mr-2" />
                      Change Password
                    </CardTitle>
                    <CardDescription>
                      Enter your current password and choose a new one
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      {/* General error/success message */}
                      {passwordErrors.general && (
                        <Alert
                          className={
                            passwordErrors.general.includes('successfully')
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }
                        >
                          <AlertDescription
                            className={
                              passwordErrors.general.includes('successfully')
                                ? 'text-green-800'
                                : 'text-red-800'
                            }
                          >
                            {passwordErrors.general}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Current Password */}
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, currentPassword: e.target.value })
                            }
                            className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                            placeholder="Enter your current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.currentPassword && (
                          <p className="text-sm text-red-600">{passwordErrors.currentPassword}</p>
                        )}
                      </div>

                      {/* New Password */}
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, newPassword: e.target.value })
                            }
                            className={passwordErrors.newPassword ? 'border-red-500' : ''}
                            placeholder="Enter your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-red-600">{passwordErrors.newPassword}</p>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                            }
                            className={passwordErrors.confirmPassword ? 'border-red-500' : ''}
                            placeholder="Confirm your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                        )}
                      </div>

                      {/* Form Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowPasswordChange(false)
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                            })
                            setPasswordErrors({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                              general: '',
                            })
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={passwordLoading} className="flex-1">
                          {passwordLoading ? 'Changing Password...' : 'Change Password'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Statistics Cards */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Your Productivity Stats
                  </CardTitle>
                  <CardDescription>Track your progress and achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading statistics...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-900">{stats.totalGoals}</div>
                        <div className="text-sm text-blue-700">Total Goals</div>
                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-900">{stats.totalTasks}</div>
                        <div className="text-sm text-green-700">Total Tasks</div>
                      </div>

                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="h-8 w-8 bg-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{completionRate}%</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">
                          {stats.completedTasks}
                        </div>
                        <div className="text-sm text-purple-700">Completed</div>
                      </div>

                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="h-8 w-8 bg-orange-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">★</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">
                          {stats.totalPoints}
                        </div>
                        <div className="text-sm text-orange-700">Total Points</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Rewards Section */}
          <RewardsSection />

          {/* Trophy Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sign-In Streak Trophies */}
            <SigninStreakTrophies />

            {/* Total Habit Completion Trophies */}
            <TotalHabitTrophies />
          </div>

          {/* Discipline Trophies Section (Per-Habit) */}
          <DisciplineTrophies />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your productivity system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Target className="h-6 w-6 mb-2" />
                  <span>Go to Dashboard</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/modules')}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <Zap className="h-6 w-6 mb-2" />
                  <span>Life Hacks</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
