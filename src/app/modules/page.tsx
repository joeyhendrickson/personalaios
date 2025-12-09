'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  DollarSign,
  Brain,
  Target,
  Calendar,
  Users,
  BookOpen,
  Heart,
  Zap,
  Shield,
  Activity,
  BarChart3,
  PieChart,
  Clock,
  Star,
  Settings,
  Lightbulb,
  Search,
  Filter,
  CheckCircle,
  X,
  Trash2,
  ShoppingCart,
  Music,
  FileText,
  AlertTriangle,
  PenTool,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import RatingStars from '@/components/rating-stars'

interface Module {
  id: string
  title: string
  description: string
  category: string
  icon: React.ReactNode
  status: 'available' | 'installed' | 'premium'
  features: string[]
  complexity: 'beginner' | 'intermediate' | 'advanced'
}

interface InstalledModule {
  id: string
  module_id: string
  installed_at: string
  last_accessed: string
  is_active: boolean
}

interface AppRating {
  rating: number
  reviewText?: string
  averageRating: number
  totalRatings: number
  userRating?: {
    rating: number
    reviewText?: string
    createdAt: string
    updatedAt: string
  }
}

const modules: Module[] = [
  {
    id: 'day-trader',
    title: 'Day Trader',
    description: 'Advanced stock analysis and trading pattern detection with AI-powered insights.',
    category: 'Finance',
    icon: <TrendingUp className="h-8 w-8" />,
    status: 'available',
    features: ['Stock Analysis', 'Pattern Detection', 'AI Predictions', 'Risk Management'],
    complexity: 'advanced',
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Optimizer',
    description: 'AI-powered budget analysis and spending optimization recommendations.',
    category: 'Finance',
    icon: <DollarSign className="h-8 w-8" />,
    status: 'available',
    features: ['Expense Tracking', 'Budget Analysis', 'Savings Goals', 'Investment Advice'],
    complexity: 'beginner',
  },
  {
    id: 'grocery-optimizer',
    title: 'Grocery Store Optimizer',
    description: 'AI-powered grocery receipt analysis and cost optimization recommendations.',
    category: 'Finance',
    icon: <ShoppingCart className="h-8 w-8" />,
    status: 'available',
    features: [
      'Receipt Analysis',
      'Cost Comparison',
      'Store Recommendations',
      'Savings Optimization',
    ],
    complexity: 'beginner',
  },
  {
    id: 'ai-coach',
    title: 'Life Coach',
    description: 'Personal AI coach for goal setting, motivation, and life optimization.',
    category: 'Productivity',
    icon: <Brain className="h-8 w-8" />,
    status: 'available',
    features: ['Goal Setting', 'Motivation', 'Habit Tracking', 'Progress Analysis'],
    complexity: 'intermediate',
  },
  {
    id: 'fitness-tracker',
    title: 'Fitness Tracker',
    description: 'Comprehensive fitness tracking with AI-powered workout recommendations.',
    category: 'Health',
    icon: <Activity className="h-8 w-8" />,
    status: 'available',
    features: ['Workout Plans', 'Progress Tracking', 'Nutrition Analysis', 'Recovery Monitoring'],
    complexity: 'intermediate',
  },
  {
    id: 'time-blocker',
    title: 'Time Blocker',
    description: 'Advanced time management with AI-optimized scheduling and focus sessions.',
    category: 'Productivity',
    icon: <Clock className="h-8 w-8" />,
    status: 'available',
    features: ['Smart Scheduling', 'Focus Sessions', 'Time Analysis', 'Productivity Insights'],
    complexity: 'beginner',
  },
  {
    id: 'relationship-manager',
    title: 'Relationship Manager',
    description: 'Track and optimize personal and professional relationships.',
    category: 'Social',
    icon: <Users className="h-8 w-8" />,
    status: 'available',
    features: [
      'Contact Management',
      'Interaction Tracking',
      'Reminder System',
      'Relationship Insights',
    ],
    complexity: 'beginner',
  },
  {
    id: 'calendar-ai',
    title: 'Calendar AI',
    description: 'AI-powered calendar management with smart scheduling and optimization.',
    category: 'Productivity',
    icon: <Calendar className="h-8 w-8" />,
    status: 'available',
    features: ['Smart Scheduling', 'Conflict Resolution', 'Time Optimization', 'Meeting Insights'],
    complexity: 'beginner',
  },
  {
    id: 'analytics-dashboard',
    title: 'Analytics Dashboard',
    description: 'Comprehensive analytics and insights for all your life metrics.',
    category: 'Analytics',
    icon: <BarChart3 className="h-8 w-8" />,
    status: 'premium',
    features: ['Data Visualization', 'Trend Analysis', 'Predictive Insights', 'Custom Reports'],
    complexity: 'advanced',
  },
  {
    id: 'focus-enhancer',
    title: 'Focus Enhancer',
    description:
      'AI-powered screen time analysis and therapeutic conversations to improve digital wellness.',
    category: 'Wellness',
    icon: <Brain className="h-8 w-8" />,
    status: 'available',
    features: [
      'Screen Time Analysis',
      'Therapeutic Conversations',
      'Digital Wellness',
      'Habit Building',
    ],
    complexity: 'beginner',
  },
  {
    id: 'habit-master',
    title: 'Habit Master',
    description: 'Advanced habit tracking and optimization with behavioral insights.',
    category: 'Productivity',
    icon: <Star className="h-8 w-8" />,
    status: 'available',
    features: ['Habit Tracking', 'Behavioral Analysis', 'Optimization Tips', 'Streak Management'],
    complexity: 'beginner',
  },
  {
    id: 'dream-catcher',
    title: 'Dream Catcher',
    description:
      'AI-powered personality and personal assessment to discover your true dreams, create your vision, and generate actionable goals.',
    category: 'Wellness',
    icon: <Sparkles className="h-8 w-8" />,
    status: 'available',
    features: [
      'Personality Assessment',
      'Personal Discovery',
      'Dream Identification',
      'Vision Creation',
      'Goal Generation',
    ],
    complexity: 'intermediate',
  },
]

const categories = [
  'All',
  'Finance',
  'Productivity',
  'Health',
  'Social',
  'Education',
  'Analytics',
  'Wellness',
]

export default function ModulesPage() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedComplexity, setSelectedComplexity] = useState('All')
  const [installedModules, setInstalledModules] = useState<InstalledModule[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [businessApps, setBusinessApps] = useState<
    Array<{
      id: string
      name: string
      description: string
      icon: string
    }>
  >([])
  const [businessAppsLoading, setBusinessAppsLoading] = useState(true)
  const [appRatings, setAppRatings] = useState<Record<string, AppRating>>({})
  const [ratingLoading, setRatingLoading] = useState<Record<string, boolean>>({})

  // Fetch installed modules and business apps on component mount
  useEffect(() => {
    fetchInstalledModules()
    fetchBusinessApps()
  }, [])

  const fetchBusinessApps = async () => {
    try {
      const response = await fetch('/api/business-hacks')
      if (response.ok) {
        const data = await response.json()
        setBusinessApps(data.businessApps || [])
      }
    } catch (error) {
      console.error('Error fetching business apps:', error)
    } finally {
      setBusinessAppsLoading(false)
    }
  }

  const fetchInstalledModules = async () => {
    try {
      const response = await fetch('/api/modules/installed')
      if (response.ok) {
        const data = await response.json()
        setInstalledModules(data.installedModules || [])
      }
    } catch (error) {
      console.error('Error fetching installed modules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInstallModule = async (moduleId: string) => {
    setActionLoading(moduleId)
    try {
      const response = await fetch('/api/modules/installed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId,
          action: 'install',
        }),
      })

      if (response.ok) {
        await fetchInstalledModules() // Refresh the list
      } else {
        console.error('Failed to install module')
      }
    } catch (error) {
      console.error('Error installing module:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUninstallModule = async (moduleId: string) => {
    setActionLoading(moduleId)
    try {
      const response = await fetch('/api/modules/installed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moduleId,
          action: 'uninstall',
        }),
      })

      if (response.ok) {
        await fetchInstalledModules() // Refresh the list
      } else {
        console.error('Failed to uninstall module')
      }
    } catch (error) {
      console.error('Error uninstalling module:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleModuleAccess = async (moduleId: string) => {
    try {
      await fetch('/api/modules/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ moduleId }),
      })
    } catch (error) {
      console.error('Error updating module access:', error)
    }
  }

  const isModuleInstalled = (moduleId: string) => {
    return installedModules.some((module) => module.module_id === moduleId && module.is_active)
  }

  const getInstalledModule = (moduleId: string) => {
    return installedModules.find((module) => module.module_id === moduleId && module.is_active)
  }

  const activeModules = modules.filter((module) => isModuleInstalled(module.id))
  const availableModules = modules.filter((module) => !isModuleInstalled(module.id))

  const filteredModules = availableModules.filter((module) => {
    const matchesSearch =
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory
    const matchesComplexity =
      selectedComplexity === 'All' || module.complexity === selectedComplexity

    return matchesSearch && matchesCategory && matchesComplexity
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'installed':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'premium':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner':
        return 'text-green-600 bg-green-100'
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100'
      case 'advanced':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading life hacks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Plus className="h-8 w-8 mr-3 text-black" />
                  {t('modules.title')}
                </h1>
                <p className="text-sm text-gray-600">{t('modules.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('modules.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Complexity Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedComplexity}
                onChange={(e) => setSelectedComplexity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">{t('modules.complexity.all')}</option>
                <option value="beginner">{t('modules.complexity.beginner')}</option>
                <option value="intermediate">{t('modules.complexity.intermediate')}</option>
                <option value="advanced">{t('modules.complexity.advanced')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Life Hacks Section */}
        {activeModules.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                Active Life Hacks ({activeModules.length})
              </h2>
              <p className="text-sm text-gray-500">Life hacks you're currently using</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeModules.map((module) => {
                const installedModule = getInstalledModule(module.id)
                return (
                  <div
                    key={module.id}
                    className="bg-green-50 border-2 border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                          {module.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                          <p className="text-sm text-gray-500">{module.category}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                        Active
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{module.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(module.complexity)}`}
                      >
                        {module.complexity}
                      </span>
                      <span className="text-xs text-gray-500">
                        Last used:{' '}
                        {installedModule
                          ? new Date(installedModule.last_accessed).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <Link
                        href={`/modules/${module.id}`}
                        onClick={() => handleModuleAccess(module.id)}
                      >
                        <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                          Open
                        </button>
                      </Link>
                      <button
                        onClick={() => handleUninstallModule(module.id)}
                        disabled={actionLoading === module.id}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === module.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Business Hacks Section */}
        {businessApps.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Briefcase className="h-6 w-6 mr-2 text-black" />
                Business Hacks ({businessApps.length})
              </h2>
              <p className="text-sm text-gray-500">Tools for business and content creation</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessApps.map((app) => {
                const getIconComponent = (iconName: string) => {
                  switch (iconName) {
                    case 'Music':
                      return <Music className="h-8 w-8" />
                    case 'BookOpen':
                      return <BookOpen className="h-8 w-8" />
                    case 'FileText':
                      return <FileText className="h-8 w-8" />
                    case 'AlertTriangle':
                      return <AlertTriangle className="h-8 w-8" />
                    case 'PenTool':
                      return <PenTool className="h-8 w-8" />
                    default:
                      return <Briefcase className="h-8 w-8" />
                  }
                }

                const getAppPath = (appName: string) => {
                  switch (appName) {
                    case 'Co-Writer':
                      return '/business-hacks/co-writer'
                    case 'Ghost Writer':
                      return '/business-hacks/ghost-writer'
                    case 'Project Plan Builder':
                      return '/business-hacks/project-plan-builder'
                    case 'RAID Monitoring Tool':
                      return '/business-hacks/raid-monitoring'
                    case 'Post Creator':
                      return '/business-hacks/post-creator'
                    default:
                      return '/business-hacks'
                  }
                }

                return (
                  <div
                    key={app.id}
                    className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-black">
                          {getIconComponent(app.icon)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                          <p className="text-sm text-gray-500">Business Tool</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-black border border-gray-200">
                        Installed
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{app.description}</p>

                    <div className="flex space-x-2">
                      <Link href={getAppPath(app.name)} className="flex-1">
                        <button className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium">
                          Install
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Life Hacks Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Plus className="h-6 w-6 mr-2 text-blue-600" />
              Available Life Hacks ({filteredModules.length})
            </h2>
            <p className="text-sm text-gray-500">
              Install new life hacks to enhance your experience
            </p>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">{module.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                    <p className="text-sm text-gray-500">{module.category}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(module.status)}`}
                >
                  {module.status}
                </span>
              </div>

              <p className="text-gray-600 mb-4">{module.description}</p>

              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(module.complexity)}`}
                >
                  {module.complexity}
                </span>
                <span className="text-xs text-gray-500">{module.features.length} features</span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Features:</h4>
                <div className="flex flex-wrap gap-1">
                  {module.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleInstallModule(module.id)}
                  disabled={actionLoading === module.id}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading === module.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Installing...
                    </div>
                  ) : (
                    'Install'
                  )}
                </button>
                {module.status === 'premium' && (
                  <button className="px-3 py-2 border border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 transition-colors text-sm font-medium">
                    <Star className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No life hacks found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
