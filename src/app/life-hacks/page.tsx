'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Lightbulb,
  Clock,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Heart,
  DollarSign,
  Users,
  Home,
  Car,
  ShoppingCart,
  Coffee,
  Dumbbell,
  Moon,
  Sun,
} from 'lucide-react'
import Link from 'next/link'

interface LifeHack {
  id: string
  title: string
  description: string
  category: string
  timeToImplement: string
  impact: 'low' | 'medium' | 'high'
  icon: React.ReactNode
}

const lifeHacks: LifeHack[] = [
  {
    id: '1',
    title: 'Two-Minute Rule',
    description:
      'If a task takes less than 2 minutes, do it immediately instead of adding it to your to-do list.',
    category: 'Productivity',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    id: '2',
    title: 'Pomodoro Technique',
    description:
      'Work in 25-minute focused intervals followed by 5-minute breaks to maintain concentration.',
    category: 'Productivity',
    timeToImplement: '5 minutes',
    impact: 'high',
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: '3',
    title: 'Morning Pages',
    description:
      'Write 3 pages of stream-of-consciousness thoughts first thing in the morning to clear your mind.',
    category: 'Mental Health',
    timeToImplement: '15 minutes',
    impact: 'medium',
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    id: '4',
    title: 'Gratitude Journal',
    description:
      "Write down 3 things you're grateful for each day to improve mental well-being and perspective.",
    category: 'Mental Health',
    timeToImplement: '5 minutes',
    impact: 'high',
    icon: <Heart className="h-6 w-6" />,
  },
  {
    id: '5',
    title: 'Automated Savings',
    description:
      'Set up automatic transfers to savings accounts on payday to build wealth without thinking about it.',
    category: 'Finance',
    timeToImplement: '10 minutes',
    impact: 'high',
    icon: <DollarSign className="h-6 w-6" />,
  },
  {
    id: '6',
    title: 'Meal Prep Sundays',
    description:
      'Prepare meals for the week on Sunday to save time, money, and make healthier choices.',
    category: 'Health',
    timeToImplement: '2 hours',
    impact: 'high',
    icon: <Home className="h-6 w-6" />,
  },
  {
    id: '7',
    title: 'No Phone First Hour',
    description:
      'Avoid checking your phone for the first hour after waking up to start your day with intention.',
    category: 'Digital Wellness',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Sun className="h-6 w-6" />,
  },
  {
    id: '8',
    title: 'Power Poses',
    description:
      'Stand in confident poses for 2 minutes before important meetings to boost confidence.',
    category: 'Confidence',
    timeToImplement: '2 minutes',
    impact: 'medium',
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    id: '9',
    title: 'Cold Shower Finish',
    description: 'End your shower with 30 seconds of cold water to boost energy and immune system.',
    category: 'Health',
    timeToImplement: '30 seconds',
    impact: 'medium',
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: '10',
    title: 'Digital Sunset',
    description: 'Stop using screens 1 hour before bedtime to improve sleep quality.',
    category: 'Sleep',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Moon className="h-6 w-6" />,
  },
  {
    id: '11',
    title: 'One-Touch Rule',
    description:
      'Handle emails, messages, and papers only once - either act on them, file them, or delete them.',
    category: 'Organization',
    timeToImplement: 'Immediate',
    impact: 'high',
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: '12',
    title: 'Walking Meetings',
    description:
      'Conduct one-on-one meetings while walking to boost creativity and physical activity.',
    category: 'Health',
    timeToImplement: 'Immediate',
    impact: 'medium',
    icon: <Users className="h-6 w-6" />,
  },
]

const categories = [
  'All',
  'Productivity',
  'Mental Health',
  'Finance',
  'Health',
  'Digital Wellness',
  'Confidence',
  'Sleep',
  'Organization',
]

export default function LifeHacksPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredHacks = lifeHacks.filter((hack) => {
    const matchesCategory = selectedCategory === 'All' || hack.category === selectedCategory
    const matchesSearch =
      hack.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hack.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/dashboard">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground h-9 rounded-md px-3 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black flex items-center">
                  <Lightbulb className="h-8 w-8 mr-3 text-green-600" />
                  Life Hacks
                </h1>
                <p className="text-sm text-gray-600">
                  Simple strategies to improve your daily life and productivity
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search life hacks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Life Hacks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHacks.map((hack) => (
            <div
              key={hack.id}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-green-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">{hack.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{hack.title}</h3>
                    <span className="text-sm text-gray-500">{hack.category}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(hack.impact)}`}
                >
                  {hack.impact} impact
                </span>
              </div>

              <p className="text-gray-600 mb-4 leading-relaxed">{hack.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {hack.timeToImplement}
                </span>
                <span className="text-green-600 font-medium">Try it now →</span>
              </div>
            </div>
          ))}
        </div>

        {filteredHacks.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No life hacks found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
