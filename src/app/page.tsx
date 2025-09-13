'use client'

import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/auth/login-form'
import { WeeklyGoalsDashboard } from '@/components/dashboard/weekly-goals-dashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginForm />
      </div>
    )
  }

  return <WeeklyGoalsDashboard />
}
