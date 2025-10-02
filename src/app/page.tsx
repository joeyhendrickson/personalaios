'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  CheckCircle,
  TrendingUp,
  Brain,
  ArrowRight,
  LogIn,
  Zap,
  Shield,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const features = [
    {
      icon: Target,
      title: 'Smart Goal Tracking',
      description: 'Set and track goals with AI-powered insights and progress visualization',
    },
    {
      icon: Brain,
      title: 'AI Life Coach',
      description:
        'Personal AI assistant that understands your goals and provides tailored guidance',
    },
    {
      icon: Activity,
      title: 'Fitness & Wellness',
      description: 'AI-powered workout plans, nutrition tracking, and health optimization',
    },
    {
      icon: TrendingUp,
      title: 'Financial Tools',
      description: 'Budget optimization, investment tracking, and wealth-building strategies',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-lg z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              {user && !loading ? (
                <Link href="/dashboard">
                  <button className="px-6 py-2.5 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all text-sm">
                    Dashboard
                  </button>
                </Link>
              ) : (
                <Link href="/login">
                  <button className="px-6 py-2.5 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all text-sm">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-32 md:py-48">
        <div className="text-center mb-20">
          <div className="mx-auto mb-12">
            {/* Custom Life Stacks Logo */}
            <div className="flex items-center justify-center space-x-8">
              {/* Stacked layers icon */}
              <div className="flex flex-col space-y-3">
                <div className="w-32 h-10 bg-white rounded-xl shadow-lg"></div>
                <div className="w-32 h-10 bg-white rounded-xl shadow-lg"></div>
                <div className="w-32 h-10 bg-white rounded-xl shadow-lg"></div>
              </div>
              {/* Life Stacks text */}
              <div className="text-left">
                <div className="text-8xl font-bold text-white leading-none tracking-tight">
                  Life
                </div>
                <div className="text-8xl font-bold text-white leading-none tracking-tight">
                  Stacks
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
            Stack your life,
            <br />
            powered by AI.
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Your goals, habits, and life hacks — stacked.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user && !loading ? (
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all text-lg flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all text-lg">
                    Sign In
                  </button>
                </Link>
                <Link href="/login">
                  <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-black transition-all text-lg">
                    Create Account
                  </button>
                </Link>
              </>
            )}
          </div>

          {loading && (
            <div className="flex justify-center mt-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
