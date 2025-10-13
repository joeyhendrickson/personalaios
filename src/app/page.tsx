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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const [showSignInForm, setShowSignInForm] = useState(false)
  const [showMainSignInForm, setShowMainSignInForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMainProcessing, setIsMainProcessing] = useState(false)
  const [signInData, setSignInData] = useState({
    email: '',
    name: '',
  })
  const [mainSignInData, setMainSignInData] = useState({
    email: '',
    password: '',
  })

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Redirect to PayPal checkout with the provided email and name
      const params = new URLSearchParams({
        email: signInData.email,
        name: signInData.name,
        plan: 'standard',
        amount: '19.99',
      })
      window.location.href = `/paypal-checkout?${params.toString()}`
    } catch (error: any) {
      console.error('Error processing sign-in:', error)
      alert(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMainSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsMainProcessing(true)

    try {
      // Sign in the user
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mainSignInData.email,
          password: mainSignInData.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Invalid email or password')
      }

      // Redirect to dashboard on successful login
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('Error signing in:', error)
      alert(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsMainProcessing(false)
    }
  }

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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <LanguageToggle />
              {user && !loading ? (
                <Link href="/dashboard">
                  <button className="px-6 py-2.5 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all text-sm">
                    {t('home.dashboard')}
                  </button>
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setShowSignInForm(!showSignInForm)}
                    className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-all text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2"
                  >
                    <span>Subscribe</span>
                    {showSignInForm ? (
                      <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>

                  {/* Subscribe Dropdown Form */}
                  {showSignInForm && (
                    <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] z-50">
                      <Card className="bg-white shadow-xl border border-gray-200">
                        <CardHeader className="pb-4"></CardHeader>
                        <CardContent>
                          <form onSubmit={handleSignInSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="signin-name" className="text-black text-sm">
                                {t('form.fullName')}
                              </Label>
                              <Input
                                id="signin-name"
                                type="text"
                                value={signInData.name}
                                onChange={(e) =>
                                  setSignInData({ ...signInData, name: e.target.value })
                                }
                                required
                                placeholder={t('form.enterName')}
                                className="text-black"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="signin-email" className="text-black text-sm">
                                {t('form.email')}
                              </Label>
                              <Input
                                id="signin-email"
                                type="email"
                                value={signInData.email}
                                onChange={(e) =>
                                  setSignInData({ ...signInData, email: e.target.value })
                                }
                                required
                                placeholder={t('form.enterEmail')}
                                className="text-black"
                              />
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSignInForm(false)}
                                className="flex-1 text-black border-gray-300 hover:bg-gray-50"
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                type="submit"
                                disabled={isProcessing}
                                className="flex-1 bg-black hover:bg-gray-800 text-white"
                              >
                                {isProcessing ? t('form.processing') : t('form.subscribe')}
                              </Button>
                            </div>
                          </form>

                          <div className="mt-4 text-center">
                            <Link
                              href="/create-account"
                              className="text-sm text-gray-600 hover:text-black"
                            >
                              {t('form.explorePlans')}
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 lg:py-48">
        <div className="text-center mb-12 sm:mb-16 md:mb-20">
          <div className="mx-auto mb-8 sm:mb-10 md:mb-12">
            {/* Custom Life Stacks Logo */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-6 md:space-x-8">
              {/* Stacked layers icon */}
              <div className="flex flex-col space-y-2 sm:space-y-3">
                <div className="w-16 h-4 sm:w-20 sm:h-5 md:w-24 md:h-6 lg:w-32 lg:h-10 bg-white rounded-lg sm:rounded-xl shadow-lg"></div>
                <div className="w-16 h-4 sm:w-20 sm:h-5 md:w-24 md:h-6 lg:w-32 lg:h-10 bg-white rounded-lg sm:rounded-xl shadow-lg"></div>
                <div className="w-16 h-4 sm:w-20 sm:h-5 md:w-24 md:h-6 lg:w-32 lg:h-10 bg-white rounded-lg sm:rounded-xl shadow-lg"></div>
              </div>
              {/* Life Stacks text */}
              <div className="text-left">
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold text-white leading-none tracking-tight">
                  Life
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-8xl font-bold text-white leading-none tracking-tight">
                  Stacks
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight tracking-tight px-2">
            {t('home.tagline').split(',')[0]},
            <br />
            {t('home.tagline').split(',')[1]}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-12 leading-relaxed px-4">
            {t('home.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            {user && !loading ? (
              <Link href="/dashboard">
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all text-base sm:text-lg flex items-center justify-center space-x-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{t('home.goToDashboard')}</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </Link>
            ) : (
              <>
                <div className="relative w-full sm:w-auto">
                  <button
                    onClick={() => setShowMainSignInForm(!showMainSignInForm)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all text-base sm:text-lg flex items-center justify-center space-x-2"
                  >
                    <span>{t('home.signIn')}</span>
                    {showMainSignInForm ? (
                      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>

                  {/* Main Sign-in Dropdown Form */}
                  {showMainSignInForm && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] z-50">
                      <Card className="bg-white shadow-xl border border-gray-200">
                        <CardHeader className="pb-4"></CardHeader>
                        <CardContent>
                          <form onSubmit={handleMainSignInSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label
                                  htmlFor="main-signin-email"
                                  className="text-black text-sm text-left"
                                >
                                  {t('form.email')}
                                </Label>
                                <Input
                                  id="main-signin-email"
                                  type="email"
                                  value={mainSignInData.email}
                                  onChange={(e) =>
                                    setMainSignInData({ ...mainSignInData, email: e.target.value })
                                  }
                                  required
                                  placeholder={t('form.enterEmail')}
                                  className="text-black"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label
                                  htmlFor="main-signin-password"
                                  className="text-black text-sm text-left"
                                >
                                  {t('form.password')}
                                </Label>
                                <Input
                                  id="main-signin-password"
                                  type="password"
                                  value={mainSignInData.password}
                                  onChange={(e) =>
                                    setMainSignInData({
                                      ...mainSignInData,
                                      password: e.target.value,
                                    })
                                  }
                                  required
                                  placeholder={t('form.enterPassword')}
                                  className="text-black"
                                />
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowMainSignInForm(false)}
                                className="flex-1 text-black border-gray-300 hover:bg-gray-50"
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                type="submit"
                                disabled={isMainProcessing}
                                className="flex-1 bg-black hover:bg-gray-800 text-white"
                              >
                                {isMainProcessing ? t('form.signingIn') : t('form.signIn')}
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
                <Link href="/create-account">
                  <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-black transition-all text-base sm:text-lg">
                    {t('home.createAccount')}
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
