'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  Target, 
  CheckCircle, 
  Eye,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface DashboardData {
  total_users: number;
  active_users_today: number;
  total_tasks_created: number;
  total_goals_created: number;
  total_tasks_completed: number;
  total_goals_completed: number;
  average_session_duration: number;
  top_active_users: Array<{
    email: string;
    total_visits: number;
    total_time_spent: number;
    last_visit: string;
    tasks_created: number;
    goals_created: number;
  }>;
}

interface User {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  total_visits: number;
  total_time_spent: number;
  total_tasks_created: number;
  total_goals_created: number;
  total_tasks_completed: number;
  total_goals_completed: number;
  last_visit: string;
  first_visit: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  activity_data: Record<string, unknown>;
  page_url: string;
  created_at: string;
  auth: {
    users: {
      email: string;
    };
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: userLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [newUsers, setNewUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      console.log('Admin dashboard API response:', data);
      
      // Check if the response contains an error
      if (data.error) {
        throw new Error(data.error);
      }
      
      setDashboardData(data.dashboard || {});
      setUsers(data.users || []);
      setRecentActivity(data.recentActivity || []);
      setError(null);

      // Fetch new users (last 24 hours)
      const newUsersResponse = await fetch('/api/admin/new-users?hours=24');
      if (newUsersResponse.ok) {
        const newUsersData = await newUsersResponse.json();
        setNewUsers(newUsersData.newUsers);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check authentication and admin status
    if (!userLoading && !adminLoading) {
      if (!user) {
        // User not logged in, redirect to main login
        router.push('/login');
        return;
      }
      
      if (!isAdmin) {
        // User logged in but not admin, redirect to regular dashboard
        router.push('/dashboard');
        return;
      }
      
      // User is admin, fetch dashboard data
      fetchDashboardData();
    }
  }, [user, isAdmin, userLoading, adminLoading, router]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'login': return <Users className="h-4 w-4" />;
      case 'task_created': return <Target className="h-4 w-4" />;
      case 'goal_created': return <Target className="h-4 w-4" />;
      case 'task_completed': return <CheckCircle className="h-4 w-4" />;
      case 'goal_completed': return <CheckCircle className="h-4 w-4" />;
      case 'page_visit': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'task_created': return 'bg-green-100 text-green-800';
      case 'goal_created': return 'bg-purple-100 text-purple-800';
      case 'task_completed': return 'bg-emerald-100 text-emerald-800';
      case 'goal_completed': return 'bg-emerald-100 text-emerald-800';
      case 'page_visit': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || userLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => router.push('/dashboard')} 
                variant="outline" 
                size="sm"
              >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tasks Created</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_tasks_created || 0}
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
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.total_tasks_completed || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New Users (Last 24 Hours) */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Users (24h)</h3>
            <div className="space-y-3">
              {newUsers.length > 0 ? (
                newUsers.slice(0, 5).map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">+</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {user.total_visits} visits
                      </p>
                      <p className="text-xs text-gray-600">
                        {user.total_tasks_created + user.total_goals_created} items
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No new users in the last 24 hours</p>
              )}
            </div>
          </Card>

          {/* Top Active Users */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Active Users</h3>
            <div className="space-y-4">
              {dashboardData?.top_active_users?.slice(0, 5).map((user, index) => (
                <div key={user.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                    <p className="text-sm font-medium text-gray-900">
                      {user.tasks_created + user.goals_created} items
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(user.last_visit)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No user data available</p>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity && recentActivity.length > 0 ? recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
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
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              )) : (
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
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Goals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users && users.length > 0 ? users.map((user) => (
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
                      <span className="text-sm text-gray-900">
                        {user.total_visits}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatTime(user.total_time_spent)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Badge variant="outline">
                          {user.total_tasks_created} created
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {user.total_tasks_completed} completed
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Badge variant="outline">
                          {user.total_goals_created} created
                        </Badge>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {user.total_goals_completed} completed
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_visit 
                        ? formatDate(user.last_visit)
                        : 'Never'
                      }
                    </td>
                  </tr>
                )) : (
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
  );
}
