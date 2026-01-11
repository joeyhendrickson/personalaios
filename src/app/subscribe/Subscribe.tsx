'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, CreditCard, Shield, Zap, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import PayPalSubscriptionButton from '@/components/paypal/paypal-subscription-button'

export default function Subscribe() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'premium'>('standard')

  useEffect(() => {
    // If not authenticated, redirect to signup
    if (!user) {
      router.push('/signup?plan=standard')
      return
    }

    // Get plan from URL
    const planParam = searchParams.get('plan')
    if (planParam === 'premium') {
      setSelectedPlan('premium')
    }
  }, [user, searchParams, router])

  const handleSubscriptionSuccess = () => {
    router.push('/dashboard?subscription=success')
  }

  const handleSubscriptionError = (error: string) => {
    alert(`Subscription failed: ${error}`)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const plans = {
    standard: {
      name: 'Life Stacks Standard',
      price: '$19.99',
      description: 'Perfect for individuals getting started',
      features: [
        'AI-powered task prioritization',
        'Goal tracking & analytics',
        'Habit master with streaks',
        'Excel import & AI suggestions',
        'Progress tracking dashboard',
        'Email support',
      ],
      color: 'blue',
    },
    premium: {
      name: 'Life Stacks Premium',
      price: '$249.99',
      description: 'For power users who want it all',
      features: [
        'Everything in Standard',
        'AI Life Coach with unlimited sessions',
        'Focus Enhancer & productivity tools',
        'Relationship Manager',
        'Fitness Tracker with AI plans',
        'Budget Advisor with Plaid integration',
        'Market Advisor analysis tools',
        'Priority support',
        'Early access to new features',
      ],
      color: 'purple',
    },
  }

  const currentPlan = plans[selectedPlan]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Your Plan</h1>
          <p className="text-gray-600">
            You're signed in as <span className="font-semibold">{user.email}</span>
          </p>
        </div>

        {/* Plan Selection Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm inline-flex">
            <Button
              variant={selectedPlan === 'standard' ? 'default' : 'ghost'}
              onClick={() => setSelectedPlan('standard')}
              className="px-6"
            >
              Standard
            </Button>
            <Button
              variant={selectedPlan === 'premium' ? 'default' : 'ghost'}
              onClick={() => setSelectedPlan('premium')}
              className="px-6"
            >
              Premium
            </Button>
          </div>
        </div>

        {/* Plan Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div
              className={`mx-auto w-16 h-16 bg-${currentPlan.color}-100 rounded-full flex items-center justify-center mb-4`}
            >
              {selectedPlan === 'premium' ? (
                <Zap className={`h-8 w-8 text-${currentPlan.color}-600`} />
              ) : (
                <Shield className={`h-8 w-8 text-${currentPlan.color}-600`} />
              )}
            </div>
            <CardTitle className="text-3xl">{currentPlan.name}</CardTitle>
            <CardDescription className="text-lg">{currentPlan.description}</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold text-gray-900">{currentPlan.price}</span>
              <span className="text-gray-600">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            {/* Features List */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">What's included:</h3>
              <ul className="space-y-3">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PayPal Subscription Button */}
            <div className="space-y-4">
              <PayPalSubscriptionButton
                planType="standard"
                userEmail={user.email || ''}
                userId={user.id}
                onSuccess={handleSubscriptionSuccess}
                onError={handleSubscriptionError}
              />

              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <CreditCard className="h-4 w-4" />
                  <span>Secure payment powered by PayPal</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Cancel anytime. No long-term contracts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            By subscribing, you agree to our{' '}
            <a href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>{' '}
            and Terms of Service.
          </p>
        </div>
      </div>
    </div>
  )
}
