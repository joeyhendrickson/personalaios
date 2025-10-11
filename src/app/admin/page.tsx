'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Activity, Target, CheckCircle, Eye, ArrowLeft, RefreshCw, Bug, AlertTriangle, DollarSign, CreditCard } from 'lucide-react'
import { AccessCodesManager } from '@/components/admin/access-codes-manager'

interface DashboardData {
  total_users: number
  active_users_today: number
  total_tasks_created: number
  total_goals_created: number
  total_tasks_completed: number
  total_goals_completed: number
  total_points_earned: number
  total_points_today: number
  average_session_duration: number
  top_active_users: Array<{
    email: string
    total_visits: number
    total_time_spent: number
    last_visit: string
    tasks_created: number
    goals_created: number
    total_points: number
    today_points: number
  }>
}

interface User {
  user_id: string
  email: string
  created_at: string
  last_sign_in_at: string
  total_visits: number
  total_time_spent: number
  total_tasks_created: number
  total_goals_created: number
  total_tasks_completed: number
  total_goals_completed: number
  total_points: number
  today_points: number
  weekly_points: number
  last_visit: string
  first_visit: string
}

interface ActivityLog {
  id: string
  user_id: string
  activity_type: string
  activity_data: Record<string, unknown>
  page_url: string
  created_at: string
  auth: {
    users: {
      email: string
    }
  }
}

interface BugReport {
  id: string
  user_id: string
  user_email: string
  type: 'bug' | 'feature'
  title: string
  description: string
  screenshot_url?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  admin_notes?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

interface TrialSubscription {
  id: string
  email: string
  name?: string
  trial_start: string
  trial_end: string
  status: string
  will_convert_to: string
  conversion_price: number
  expiry_notification_sent_at?: string
  expiry_notification_message_id?: string
  expired_notification_sent_at?: string
  expired_notification_message_id?: string
  daysRemaining: number
  isExpired: boolean
  notificationStatus: {
    expiryNotificationSent: boolean
    expiredNotificationSent: boolean
    needsExpiryNotification: boolean
    needsExpiredNotification: boolean
  }
  created_at: string
}

interface TrialStats {
  total: number
  active: number
  expired: number
  converted: number
  cancelled: number
  expiryNotificationsSent: number
  expiredNotificationsSent: number
  pendingNotifications: number
}

interface Payment {
  id: string
  paypal_order_id: string
  amount: number
  currency: string
  plan_type: string
  status: string
  user_email: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

interface PaymentStats {
  total: number
  totalRevenue: number
  basicPlanCount: number
  premiumPlanCount: number
  thisMonth: number
  thisMonthRevenue: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdminAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [newUsers, setNewUsers] = useState<User[]>([])
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [trials, setTrials] = useState<TrialSubscription[]>([])
  const [trialStats, setTrialStats] = useState<TrialStats | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')

      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required')
          return
        }
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      console.log('Admin dashboard API response:', data)
      console.log('Dashboard data:', data.dashboard)
      console.log('Users data:', data.users)
      console.log('Recent activity:', data.recentActivity)

      // Check if the response contains an error
      if (data.error) {
        throw new Error(data.error)
      }

      setDashboardData(data.dashboard || {})
      setUsers(data.users || [])
      setRecentActivity(data.recentActivity || [])
      setError(null)

      // Fetch new users (last 24 hours)
      const newUsersResponse = await fetch('/api/admin/new-users?hours=24')
      if (newUsersResponse.ok) {
        const newUsersData = await newUsersResponse.json()
        setNewUsers(newUsersData.newUsers)
      }

      // Fetch bug reports
      const bugReportsResponse = await fetch('/api/admin/bug-reports')
      if (bugReportsResponse.ok) {
        const bugReportsData = await bugReportsResponse.json()
        setBugReports(bugReportsData.bugReports || [])
      }

      // Fetch trial subscriptions
      const trialsResponse = await fetch('/api/admin/trials')
      if (trialsResponse.ok) {
        const trialsData = await trialsResponse.json()
        setTrials(trialsData.trials || [])
        setTrialStats(trialsData.stats || null)
      }

      // Fetch payments
      const paymentsResponse = await fetch('/api/admin/payments')
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPayments(paymentsData.payments || [])
        setPaymentStats(paymentsData.stats || null)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    // Check authentication and admin status
    if (!userLoading && !adminLoading) {
      if (!user) {
        // User not logged in, redirect to main login
        router.push('/login')
        return
      }

      if (!isAdmin) {
        // User logged in but not admin, redirect to regular dashboard
        router.push('/dashboard')
        return
      }

      // User is admin, fetch dashboard data
      fetchDashboardData()
    }
  }, [user, isAdmin, userLoading, adminLoading, router])

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login':
        return <Users className="h-4 w-4" />
      case 'task_created':
        return <Target className="h-4 w-4" />
      case 'goal_created':
        return <Target className="h-4 w-4" />
      case 'task_completed':
        return <CheckCircle className="h-4 w-4" />
      case 'goal_completed':
        return <CheckCircle className="h-4 w-4" />
      case 'page_visit':
        return <Eye className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'login':
        return 'bg-blue-100 text-blue-800'
      case 'task_created':
        return 'bg-green-100 text-green-800'
      case 'goal_created':
        return 'bg-purple-100 text-purple-800'
      case 'task_completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'goal_completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'page_visit':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading || userLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button onClick={() => router.push('/dashboard')} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Personal AI OS Analytics</p>
              </div>
            </div>
            <Button onClick={fetchDashboardData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_users || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.active_users_today || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Bug className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bug Reports</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bugReports.length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Trials</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trialStats?.active || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trialStats?.pendingNotifications || 0} need notification
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Points</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_points_earned || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Points Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_points_today || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${paymentStats?.totalRevenue.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentStats?.total || 0} payments
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${paymentStats?.thisMonthRevenue.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {paymentStats?.thisMonth || 0} payments
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Access Codes Manager */}
        <div className="mb-8">
          <AccessCodesManager />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bug Reports */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Bug className="h-5 w-5 mr-2 text-red-500" />
              Bug Reports
            </h3>
            <div className="space-y-3">
              {bugReports.length > 0 ? (
                bugReports.slice(0, 5).map((bug) => (
                  <div
                    key={bug.id}
                    className={`p-3 rounded-lg border ${
                      bug.priority === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : bug.priority === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : bug.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            bug.type === 'bug' 
                              ? 'bg-red-100 text-red-700 border-red-300' 
                              : 'bg-blue-100 text-blue-700 border-blue-300'
                          }`}
                        >
                          {bug.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            bug.priority === 'critical' 
                              ? 'bg-red-100 text-red-700 border-red-300' 
                              : bug.priority === 'high'
                              ? 'bg-orange-100 text-orange-700 border-orange-300'
                              : bug.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {bug.priority}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            bug.status === 'open' 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : bug.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : bug.status === 'completed'
                              ? 'bg-gray-100 text-gray-700 border-gray-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}
                        >
                          {bug.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm mb-1">{bug.title}</p>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{bug.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{bug.user_email}</p>
                        <p className="text-xs text-gray-500">{formatDate(bug.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No bug reports</p>
              )}
            </div>
          </Card>

          {/* Trial Subscriptions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-500" />
                Trial Subscriptions
              </span>
              {trialStats && (
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-600">Active: <strong>{trialStats.active}</strong></span>
                  <span className="text-orange-600">Pending Notifications: <strong>{trialStats.pendingNotifications}</strong></span>
                  <span className="text-green-600">Converted: <strong>{trialStats.converted}</strong></span>
                </div>
              )}
            </h3>
            <div className="space-y-3">
              {trials.length > 0 ? (
                trials.slice(0, 10).map((trial) => (
                  <div
                    key={trial.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {trial.email}
                          {trial.name && <span className="text-gray-500 ml-2">({trial.name})</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {formatDate(trial.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            trial.status === 'active' 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : trial.status === 'expired'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : trial.status === 'converted'
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}
                        >
                          {trial.status}
                        </Badge>
                        {!trial.isExpired && trial.daysRemaining <= 2 && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            {trial.daysRemaining}d left
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Trial Period</p>
                        <p className="text-xs font-medium text-gray-900">
                          {new Date(trial.trial_start).toLocaleDateString()} - {new Date(trial.trial_end).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Will Convert To</p>
                        <p className="text-xs font-medium text-gray-900">
                          ${trial.conversion_price}/mo ({trial.will_convert_to})
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Email Notifications:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          {trial.notificationStatus.expiryNotificationSent ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-700">48h notice sent</span>
                            </>
                          ) : trial.notificationStatus.needsExpiryNotification ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="text-xs text-orange-700">Needs 48h notice</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">No 48h notice yet</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {trial.notificationStatus.expiredNotificationSent ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-700">Expiry notice sent</span>
                            </>
                          ) : trial.notificationStatus.needsExpiredNotification ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-700">Needs expiry notice</span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-500">No expiry notice yet</span>
                          )}
                        </div>
                      </div>
                      {trial.expiry_notification_sent_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          48h notice sent: {formatDate(trial.expiry_notification_sent_at)}
                        </p>
                      )}
                      {trial.expired_notification_sent_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expiry notice sent: {formatDate(trial.expired_notification_sent_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No trial subscriptions</p>
              )}
            </div>
          </Card>

          {/* Payments */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-emerald-500" />
                Recent Payments
              </span>
              {paymentStats && (
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-gray-600">Total: <strong>${paymentStats.totalRevenue.toFixed(2)}</strong></span>
                  <span className="text-blue-600">Basic: <strong>{paymentStats.basicPlanCount}</strong></span>
                  <span className="text-purple-600">Premium: <strong>{paymentStats.premiumPlanCount}</strong></span>
                </div>
              )}
            </h3>
            <div className="space-y-3">
              {payments.length > 0 ? (
                payments.slice(0, 10).map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {payment.user_email || 'Email not provided'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PayPal Order: {payment.paypal_order_id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            payment.plan_type === 'basic' 
                              ? 'bg-blue-100 text-blue-700 border-blue-300' 
                              : 'bg-purple-100 text-purple-700 border-purple-300'
                          }`}
                        >
                          {payment.plan_type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-green-100 text-green-700 border-green-300"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Amount</p>
                        <p className="text-sm font-bold text-emerald-600">
                          ${parseFloat(String(payment.amount)).toFixed(2)} {payment.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payment Date</p>
                        <p className="text-xs font-medium text-gray-900">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No payments yet</p>
              )}
            </div>
          </Card>

          {/* Top Active Users */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Active Users</h3>
            <div className="space-y-4">
              {dashboardData?.top_active_users?.slice(0, 5).map((user, index) => (
                <div
                  key={user.email}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-600">
                        {user.total_visits} visits • {formatTime(user.total_time_spent)} spent
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.total_points} points</p>
                    <p className="text-xs text-gray-600">{user.today_points} today</p>
                  </div>
                </div>
              )) || <p className="text-gray-500 text-center py-4">No user data available</p>}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <div className={`p-1 rounded ${getActivityColor(activity.activity_type)}`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.auth?.users?.email || `User ${activity.user_id?.substring(0, 8)}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        {activity.activity_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </Card>
        </div>

        {/* User Details Table */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Users</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Today&apos;s Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            Joined {formatDate(user.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.total_visits}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatTime(user.total_time_spent)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {user.total_points} total
                          </Badge>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {user.weekly_points} this week
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            {user.today_points} today
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_visit ? formatDate(user.last_visit) : 'Never'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  )
}
