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
  Gift,
} from 'lucide-react'
import RatingStars from '@/components/rating-stars'
import { LanguageToggle } from '@/components/ui/language-toggle'

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
  access_count?: number
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
    title: 'Market Advisor',
    description: 'Advanced stock analysis and trading pattern detection with AI-powered insights.',
    category: 'Finance',
    icon: <TrendingUp className="h-8 w-8" />,
    status: 'available',
    features: ['Stock Analysis', 'Pattern Detection', 'AI Predictions', 'Risk Management'],
    complexity: 'advanced',
  },
  {
    id: 'budget-optimizer',
    title: 'Budget Advisor',
    description:
      'Budget, income, and spending visibility, analysis, optimization, and recommendations',
    category: 'Finance',
    icon: <DollarSign className="h-8 w-8" />,
    status: 'available',
    features: ['Expense Tracking', 'Budget Analysis', 'Savings Goals', 'Investment Advice'],
    complexity: 'advanced',
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
    complexity: 'beginner',
  },
  {
    id: 'fitness-tracker',
    title: 'Fitness Tracker',
    description:
      'Comprehensive fitness tracking with recommended workout and nutrition plan based on your daily biometrics, energy level, and stress level',
    category: 'Health',
    icon: <Activity className="h-8 w-8" />,
    status: 'available',
    features: ['Workout Plans', 'Progress Tracking', 'Nutrition Analysis', 'Recovery Monitoring'],
    complexity: 'intermediate',
  },
  {
    id: 'relationship-manager',
    title: 'Relationship Manager',
    description:
      'Consider how current friendships align with your goals, projects, tasks, and gain ideas for greater outreach and connection into your relationships',
    category: 'Social',
    icon: <Users className="h-8 w-8" />,
    status: 'available',
    features: [
      'Contact Management',
      'Interaction Tracking',
      'Reminder System',
      'Relationship Insights',
    ],
    complexity: 'advanced',
  },
  {
    id: 'dating-manager',
    title: 'Dating Management',
    description:
      'Evaluate potential partners based on the life you are stacking and building — comparative analysis and date ideas to support your relationship alignment',
    category: 'Social',
    icon: <Heart className="h-8 w-8" />,
    status: 'available',
    features: [
      'Partner Criteria from Your Goals',
      'Prospect Cards & AI Evaluation',
      'Photo & Connection Analysis',
      'Date Idea Recommendations',
    ],
    complexity: 'advanced',
  },
  {
    id: 'calendar-ai',
    title: 'Lifestacks Calendar',
    description:
      'Connect Google Calendar and give LifeStacks a slot to schedule critical tasks and habits you select',
    category: 'Productivity',
    icon: <Calendar className="h-8 w-8" />,
    status: 'available',
    features: ['Google Calendar sync', 'AI scheduling', 'Editable time slots', 'Recurring habits'],
    complexity: 'beginner',
  },
  {
    id: 'analytics-dashboard',
    title: 'Productivity Analyst',
    description: 'Comprehensive view of your LifeStacks metrics.',
    category: 'Analytics',
    icon: <BarChart3 className="h-8 w-8" />,
    status: 'premium',
    features: ['Data Visualization', 'Trend Analysis', 'Predictive Insights', 'Custom Reports'],
    complexity: 'beginner',
  },
  {
    id: 'focus-enhancer',
    title: 'Focus Enhancer',
    description:
      'Accountability and therapeutic conversations to advise how your phone app time matches up with your life goals',
    category: 'Wellness',
    icon: <Brain className="h-8 w-8" />,
    status: 'available',
    features: [
      'Screen Time Analysis',
      'Therapeutic Conversations',
      'Digital Wellness',
      'Habit Building',
    ],
    complexity: 'intermediate',
  },
  {
    id: 'dream-catcher',
    title: 'Dream Catcher',
    description:
      'A conversational, personal assessment to discover your desires, dreams, create your vision, and generate actionable goals you can move towards.',
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
    complexity: 'advanced',
  },
  {
    id: 'narrative-integration',
    title: 'I Am Present',
    description: 'Make peace with the past and reduce blocks to your productivity and wellbeing',
    category: 'Wellness',
    icon: <Sparkles className="h-8 w-8" />,
    status: 'available',
    features: [
      'State Check',
      'Safety Gate',
      'Event Inventory',
      'Rumination Detection',
      'Meaning-making',
      'Present Grounding',
      'Future Reorientation',
      'Closure Summary',
    ],
    complexity: 'advanced',
  },
  {
    id: 'rewards-self-care',
    title: 'Rewards & Self-Care',
    description:
      'Trade your points in for the personal rewards you determine that enhance your enjoyment and self-care',
    category: 'Wellness',
    icon: <Gift className="h-8 w-8" />,
    status: 'available',
    features: [
      'Points balance',
      'Available rewards',
      'Partner rewards',
      'Redeemed history',
      'Custom milestones',
    ],
    complexity: 'beginner',
  },
  {
    id: 'gratitude-journal',
    title: 'Gratitude Journal',
    description:
      'Nightly challenge to write 3 things you are thankful for. Build a gratitude habit, track streaks, and earn points.',
    category: 'Wellness',
    icon: <Heart className="h-8 w-8" />,
    status: 'available',
    features: [
      'Nightly Challenge',
      'Streak Tracking',
      'Mood Rating',
      'Reflections',
      'Points Rewards',
      'AI Context Integration',
    ],
    complexity: 'beginner',
  },
]

// Purpose/intent keywords per module so search can match on what a module is *for*,
// not just literal words in its title/description (e.g. "money" → Budget Advisor,
// "workout" → Fitness Tracker, "love" → Dating Management).
const MODULE_KEYWORDS: Record<string, string[]> = {
  'day-trader': [
    'stocks',
    'stock',
    'trading',
    'trade',
    'invest',
    'investing',
    'investment',
    'market',
    'shares',
    'crypto',
    'portfolio',
    'money',
    'finance',
    'wealth',
  ],
  'budget-optimizer': [
    'budget',
    'money',
    'spending',
    'spend',
    'save',
    'savings',
    'expenses',
    'expense',
    'finance',
    'bills',
    'debt',
    'cash',
    'income',
    'afford',
  ],
  'grocery-optimizer': [
    'grocery',
    'groceries',
    'food',
    'shopping',
    'receipt',
    'store',
    'coupons',
    'meals',
    'supermarket',
    'save',
    'money',
    'cost',
  ],
  'ai-coach': [
    'coach',
    'coaching',
    'motivation',
    'goals',
    'goal',
    'mentor',
    'accountability',
    'advice',
    'guidance',
    'productivity',
    'habits',
  ],
  'fitness-tracker': [
    'fitness',
    'workout',
    'exercise',
    'gym',
    'health',
    'weight',
    'nutrition',
    'diet',
    'steps',
    'training',
    'run',
    'running',
    'biometrics',
    'cardio',
    'strength',
    'muscle',
  ],
  'relationship-manager': [
    'relationship',
    'relationships',
    'friends',
    'family',
    'networking',
    'contacts',
    'social',
    'connections',
    'colleagues',
    'people',
  ],
  'dating-manager': [
    'dating',
    'date',
    'partner',
    'love',
    'romance',
    'girlfriend',
    'boyfriend',
    'match',
    'marriage',
    'compatibility',
    'crush',
    'relationship',
    'spouse',
  ],
  'calendar-ai': [
    'calendar',
    'schedule',
    'scheduling',
    'time',
    'events',
    'planning',
    'agenda',
    'reminders',
    'appointments',
    'google calendar',
    'time blocking',
    'plan',
  ],
  'analytics-dashboard': [
    'analytics',
    'data',
    'metrics',
    'charts',
    'insights',
    'reports',
    'statistics',
    'trends',
    'dashboard',
    'productivity',
    'numbers',
  ],
  'focus-enhancer': [
    'focus',
    'concentration',
    'screen time',
    'distraction',
    'distractions',
    'phone',
    'digital',
    'attention',
    'procrastination',
    'productivity',
    'wellness',
    'doomscrolling',
  ],
  'dream-catcher': [
    'dreams',
    'dream',
    'vision',
    'purpose',
    'personality',
    'assessment',
    'goals',
    'discovery',
    'meaning',
    'aspirations',
    'identity',
    'future',
  ],
  'narrative-integration': [
    'past',
    'trauma',
    'healing',
    'heal',
    'mindfulness',
    'present',
    'peace',
    'anxiety',
    'rumination',
    'closure',
    'meditation',
    'emotional',
    'grief',
    'regret',
    'forgiveness',
  ],
  'rewards-self-care': [
    'rewards',
    'reward',
    'points',
    'self care',
    'self-care',
    'treat',
    'milestones',
    'motivation',
    'redeem',
    'gifts',
    'incentive',
  ],
  'gratitude-journal': [
    'gratitude',
    'thankful',
    'journal',
    'journaling',
    'reflection',
    'mood',
    'streak',
    'happiness',
    'mindfulness',
    'wellbeing',
    'thanks',
    'grateful',
  ],
}

const SEARCH_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'for',
  'of',
  'and',
  'or',
  'my',
  'me',
  'i',
  'app',
  'apps',
  'module',
  'modules',
  'life',
  'hack',
  'hacks',
  'that',
  'with',
  'help',
  'helps',
  'want',
  'need',
  'how',
  'do',
  'is',
  'in',
  'on',
  'it',
  'this',
  'be',
  'get',
  'best',
])

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t))
}

function fieldScore(
  tokens: string[],
  text: string,
  exactWeight: number,
  partialWeight: number
): number {
  const lower = text.toLowerCase()
  const words = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean))
  let score = 0
  for (const token of tokens) {
    if (words.has(token)) score += exactWeight
    else if (lower.includes(token)) score += partialWeight
  }
  return score
}

// Relevance score for a module against a search query. Higher = more relevant.
function scoreModule(module: Module, query: string, tokens: string[]): number {
  if (tokens.length === 0) return 0
  const features = module.features.join(' ')
  const keywords = (MODULE_KEYWORDS[module.id] || []).join(' ')

  let score = 0
  score += fieldScore(tokens, module.title, 12, 6)
  score += fieldScore(tokens, keywords, 6, 4)
  score += fieldScore(tokens, features, 5, 3)
  score += fieldScore(tokens, module.category, 4, 2)
  score += fieldScore(tokens, module.description, 3, 2)

  const q = query.trim().toLowerCase()
  if (q.length > 1) {
    if (module.title.toLowerCase().includes(q)) score += 8
    else if (module.description.toLowerCase().includes(q)) score += 4
  }
  return score
}

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
  const translateCategory = (category: string) => t(`modules.category.${category}`)
  const translateComplexity = (complexity: string) => t(`modules.complexity.${complexity}`)
  const translateStatus = (status: string) => t(`modules.status.${status}`)
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

  const matchesFilters = (module: (typeof modules)[number]) => {
    const matchesSearch =
      module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory
    const matchesComplexity =
      selectedComplexity === 'All' || module.complexity === selectedComplexity

    return matchesSearch && matchesCategory && matchesComplexity
  }

  // Show the most frequently opened life hacks first, falling back to most
  // recently used when usage is tied (or counts aren't tracked yet).
  const activeModules = modules
    .filter((module) => isModuleInstalled(module.id) && matchesFilters(module))
    .sort((a, b) => {
      const aInstalled = getInstalledModule(a.id)
      const bInstalled = getInstalledModule(b.id)
      const aCount = aInstalled?.access_count ?? 0
      const bCount = bInstalled?.access_count ?? 0
      if (bCount !== aCount) return bCount - aCount
      const aTime = aInstalled ? new Date(aInstalled.last_accessed).getTime() : 0
      const bTime = bInstalled ? new Date(bInstalled.last_accessed).getTime() : 0
      return bTime - aTime
    })
  const availableModules = modules.filter((module) => !isModuleInstalled(module.id))

  const filteredModules = availableModules.filter((module) => matchesFilters(module))

  // Unified, relevance-ranked search across ALL modules (active + inactive). When a
  // search term is present we show this instead of the Active/Available split so the
  // single most relevant life hack is recommended first regardless of install state.
  const isSearching = searchTerm.trim().length > 0
  const queryTokens = tokenizeQuery(searchTerm)
  const searchResults = isSearching
    ? modules
        .filter((module) => {
          const matchesCategory = selectedCategory === 'All' || module.category === selectedCategory
          const matchesComplexity =
            selectedComplexity === 'All' || module.complexity === selectedComplexity
          return matchesCategory && matchesComplexity
        })
        .map((module) => ({ module, score: scoreModule(module, searchTerm, queryTokens) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.module)
    : []

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

  // Card used in search results: adapts to whether the module is already installed
  // so the user can Open active modules or Install inactive ones from one ranked list.
  const renderSearchCard = (module: (typeof modules)[number]) => {
    const installed = isModuleInstalled(module.id)
    return (
      <div
        key={module.id}
        className={`life-hack-card rounded-lg p-6 hover:shadow-lg transition-shadow ${
          installed
            ? 'life-hack-card-active bg-green-50 border-2 border-green-200'
            : 'bg-white border border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`life-hack-card-icon p-2 rounded-lg ${
                installed ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              {module.icon}
            </div>
            <div>
              <h3 className="life-hack-card-title text-lg font-semibold text-gray-900">
                {module.title}
              </h3>
              <p className="text-sm text-gray-500">{translateCategory(module.category)}</p>
            </div>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full border ${
              installed
                ? 'life-hack-badge-active bg-green-100 text-green-800 border-green-200'
                : getStatusColor(module.status)
            }`}
          >
            {installed ? t('common.active') : translateStatus(module.status)}
          </span>
        </div>

        <p className="text-gray-600 mb-4">{module.description}</p>

        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(module.complexity)}`}
          >
            {translateComplexity(module.complexity)}
          </span>
          <span className="text-xs text-gray-500">
            {t('modules.featureCount', { count: module.features.length })}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {module.features.map((feature, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {feature}
              </span>
            ))}
          </div>
        </div>

        <div className="flex space-x-2">
          {installed ? (
            <>
              <Link
                href={`/modules/${module.id}`}
                onClick={() => handleModuleAccess(module.id)}
                className="flex-1"
              >
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                  {t('modules.open')}
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
            </>
          ) : (
            <>
              <button
                onClick={() => handleInstallModule(module.id)}
                disabled={actionLoading === module.id}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {actionLoading === module.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    {t('modules.installing')}
                  </div>
                ) : (
                  t('modules.install')
                )}
              </button>
              {module.status === 'premium' && (
                <button className="px-3 py-2 border border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 transition-colors text-sm font-medium">
                  <Star className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">{t('modules.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 life-hacks-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link href="/dashboard" className="self-start">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('modules.backToDashboard')}
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black">{t('modules.title')}</h1>
                <p className="text-sm text-gray-600">{t('modules.subtitle')}</p>
              </div>
            </div>
            <LanguageToggle />
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
                    {translateCategory(category)}
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
        {!isSearching && activeModules.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
                {t('modules.activeSection')} ({activeModules.length})
              </h2>
              <p className="text-sm text-gray-500">{t('modules.activeSectionHint')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeModules.map((module) => {
                const installedModule = getInstalledModule(module.id)
                return (
                  <div
                    key={module.id}
                    className="life-hack-card life-hack-card-active bg-green-50 border-2 border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="life-hack-card-icon p-2 bg-green-100 rounded-lg text-green-600">
                          {module.icon}
                        </div>
                        <div>
                          <h3 className="life-hack-card-title text-lg font-semibold text-gray-900">
                            {module.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {translateCategory(module.category)}
                          </p>
                        </div>
                      </div>
                      <span className="life-hack-badge-active px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                        {t('common.active')}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{module.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(module.complexity)}`}
                      >
                        {translateComplexity(module.complexity)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('modules.lastUsed')}{' '}
                        {installedModule
                          ? new Date(installedModule.last_accessed).toLocaleDateString()
                          : t('modules.never')}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <Link
                        href={`/modules/${module.id}`}
                        onClick={() => handleModuleAccess(module.id)}
                      >
                        <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium">
                          {t('modules.open')}
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

        {/* Business Hacks Section (temporarily hidden from user visibility) */}
        {false && businessApps.length > 0 && (
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

        {/* Search Results — relevance-ranked across all (active + inactive) life hacks */}
        {isSearching && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Search className="h-6 w-6 mr-2 text-blue-600" />
                {t('modules.searchResults')} ({searchResults.length})
              </h2>
              <p className="text-sm text-gray-500">{t('modules.searchResultsHint')}</p>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((module) => renderSearchCard(module))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('modules.noResults')}</h3>
                <p className="text-gray-500">{t('modules.noSearchResultsHint')}</p>
              </div>
            )}
          </div>
        )}

        {/* Available Life Hacks Section */}
        {!isSearching && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Plus className="h-6 w-6 mr-2 text-blue-600" />
                  {t('modules.availableSection')} ({filteredModules.length})
                </h2>
                <p className="text-sm text-gray-500">{t('modules.availableSectionHint')}</p>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((module) => (
                <div
                  key={module.id}
                  className="life-hack-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="life-hack-card-icon p-2 bg-blue-50 rounded-lg text-blue-600">
                        {module.icon}
                      </div>
                      <div>
                        <h3 className="life-hack-card-title text-lg font-semibold text-gray-900">
                          {module.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {translateCategory(module.category)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(module.status)}`}
                    >
                      {translateStatus(module.status)}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4">{module.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(module.complexity)}`}
                    >
                      {translateComplexity(module.complexity)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t('modules.featureCount', { count: module.features.length })}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {t('modules.features')}
                    </h4>
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
                          {t('modules.installing')}
                        </div>
                      ) : (
                        t('modules.install')
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('modules.noResults')}</h3>
                <p className="text-gray-500">{t('modules.noResultsHint')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
