'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Mail, CreditCard, Zap, ChevronDown, ChevronUp, Gift } from 'lucide-react'
import Link from 'next/link'

export default function CreateAccountPage() {
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'basic' | 'premium'>('trial')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showForm, setShowForm] = useState<'trial' | 'basic' | 'premium' | null>(null)
  const [showFAQ, setShowFAQ] = useState(false)
  const [isExpiredTrial, setIsExpiredTrial] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [redeemData, setRedeemData] = useState({
    code: '',
    name: '',
    email: '',
    password: '',
  })
  const [redeemError, setRedeemError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    message: '',
  })

  // Check if user came here because their trial expired
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const expired = params.get('expired')
    const email = params.get('email')

    if (expired === 'true') {
      setIsExpiredTrial(true)
      if (email) {
        setFormData((prev) => ({ ...prev, email }))
      }
      // Automatically show the standard plan form
      setSelectedPlan('basic')
      setShowForm('basic')
    }
  }, [])

  const handlePlanSelection = (plan: 'trial' | 'basic' | 'premium') => {
    console.log('Plan selected:', plan)
    setSelectedPlan(plan)
    setShowForm(plan)
    setFormData({ name: '', email: '', password: '', message: '' })
    console.log('showForm set to:', plan)
  }

  const handleRedeemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRedeemError('')
    setIsProcessing(true)

    try {
      // First verify the code
      const verifyResponse = await fetch('/api/access-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: redeemData.code,
          email: redeemData.email,
        }),
      })

      const verifyResult = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyResult.valid) {
        setRedeemError(verifyResult.error || 'Invalid access code')
        setIsProcessing(false)
        return
      }

      // Redeem the code and create premium account
      const redeemResponse = await fetch('/api/access-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: redeemData.code,
          email: redeemData.email,
          password: redeemData.password,
          name: redeemData.name,
        }),
      })

      const redeemResult = await redeemResponse.json()

      if (!redeemResponse.ok) {
        setRedeemError(redeemResult.error || 'Failed to create account')
        setIsProcessing(false)
        return
      }

      // Sign the user in
      const signinResponse = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: redeemData.email,
          password: redeemData.password,
        }),
      })

      if (!signinResponse.ok) {
        setRedeemError('Account created but failed to sign in. Please try logging in.')
        setIsProcessing(false)
        return
      }

      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (error: any) {
      console.error('Error redeeming code:', error)
      setRedeemError(error.message || 'An error occurred')
      setIsProcessing(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      if (showForm === 'trial') {
        // Use the new trial-specific signup endpoint that bypasses email confirmation
        const signupResponse = await fetch('/api/auth/trial-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
          }),
        })

        console.log('Trial signup response status:', signupResponse.status)
        const responseText = await signupResponse.text()
        console.log('Trial signup response text:', responseText)

        let signupData
        try {
          signupData = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse trial signup response:', responseText)
          throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`)
        }

        if (!signupResponse.ok) {
          console.error('Trial signup error response:', signupData)
          console.error('Trial signup error message:', signupData.error)
          console.error('Full signupData:', JSON.stringify(signupData, null, 2))

          // If user already exists, try to log them in instead
          if (signupData.error && signupData.error.includes('already registered')) {
            console.log('User already exists, attempting signin...')
            // Try to sign in with provided credentials
            const signinResponse = await fetch('/api/auth/signin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: formData.email,
                password: formData.password,
              }),
            })

            if (!signinResponse.ok) {
              const signinError = await signinResponse.json()
              console.error('Signin error:', signinError)
              throw new Error(
                'User already exists. Please use the correct password or try logging in.'
              )
            }

            console.log('User signed in successfully')
            // User signed in successfully, continue to create trial
          } else {
            throw new Error(signupData.error || 'Failed to create user account')
          }
        } else {
          console.log('User account created successfully:', signupData)
        }

        // Create trial subscription record with user ID
        const trialResponse = await fetch('/api/trial/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            plan_type: 'basic',
            userId: signupData.user?.id, // Link trial to user account
          }),
        })

        if (!trialResponse.ok) {
          const errorData = await trialResponse.json()
          throw new Error(errorData.error || 'Failed to create trial subscription')
        }

        // Check if we have a session from the signup (trial users get immediate access)
        console.log('Trial signup response data:', signupData)
        console.log('Session data:', signupData.session)

        if (signupData.session) {
          console.log('User has session, redirecting to Dream Catcher for new user onboarding')
          window.location.href = '/modules/dream-catcher?newUser=true'
        } else {
          console.log('No session returned, attempting manual sign-in')
          // Fallback: try to sign in the user
          const signinResponse = await fetch('/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          })

          console.log('Manual signin response status:', signinResponse.status)

          if (!signinResponse.ok) {
            console.error('Manual signin failed, redirecting to login page')
            // If signin fails, redirect to login page
            window.location.href = `/login?trial=success&email=${encodeURIComponent(formData.email)}`
            return
          }

          console.log(
            'Manual signin successful, redirecting to Dream Catcher for new user onboarding'
          )
          // Redirect new user to Dream Catcher
          window.location.href = '/modules/dream-catcher?newUser=true'
        }
      } else if (showForm === 'basic') {
        // Redirect directly to PayPal checkout
        // User account will be created after successful payment
        const params = new URLSearchParams({
          email: formData.email,
          name: formData.name,
          plan: 'basic',
          amount: '20.00',
        })
        window.location.href = `/paypal-checkout?${params.toString()}`
      } else if (showForm === 'premium') {
        // Send email to Joseph
        const emailBody = `Hi Joseph,

${formData.message || 'I am interested in the Life Stacks Premium Coaching plan at $250/month.'}

Please provide me with more information about the coaching services and how to get started.

Name: ${formData.name}
Email: ${formData.email}

Thank you!`

        window.location.href = `mailto:Joseph@SuddenImpactLabs.com?subject=Life Stacks Premium Coaching Inquiry&body=${encodeURIComponent(emailBody)}`
      }
    } catch (error: any) {
      console.error('Error processing form:', error)
      alert(error.message || 'An error occurred. Please try again.')
      // Log the full error for debugging
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        error: error,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          {/* Life Stacks Logo */}
          <div className="mx-auto mb-8">
            <div className="flex items-center justify-center space-x-8">
              {/* Stacked layers icon */}
              <div className="flex flex-col space-y-3">
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
                <div className="w-24 h-8 bg-white rounded-lg shadow-lg"></div>
              </div>
              {/* Life Stacks text */}
              <div className="text-left">
                <div className="text-6xl font-bold text-white leading-none tracking-tight">
                  Life
                </div>
                <div className="text-6xl font-bold text-white leading-none tracking-tight">
                  Stacks
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {isExpiredTrial ? 'Your Trial Has Expired' : 'Choose Your Plan'}
          </h1>
          {isExpiredTrial ? (
            <div className="max-w-2xl mx-auto mb-4">
              <div className="bg-orange-500 text-white p-4 rounded-lg mb-4">
                <p className="text-lg font-semibold mb-2">⏰ Your 7-day free trial has ended</p>
                <p className="text-sm">
                  Continue your journey with Life Stacks! Upgrade to our Standard Plan to keep all
                  your progress and data.
                </p>
              </div>
            </div>
          ) : null}
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {isExpiredTrial
              ? 'Choose a plan below to continue using Life Stacks and keep your data.'
              : 'Direct your life and build your focus with our AI-driven Life Stacks platform. Start your transformation with the plan that is right for you.'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Trial Plan */}
          <Card
            className={`relative ${selectedPlan === 'trial' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
          >
            <CardHeader className="text-center pb-4">
              <Badge className="w-fit mx-auto mb-2 bg-green-100 text-green-800">RECOMMENDED</Badge>
              <CardTitle className="text-2xl">7-Day Free Trial</CardTitle>
              <CardDescription className="text-lg">Experience Life Stacks</CardDescription>
              <div className="text-3xl font-bold text-green-600 mt-4">
                $0
                <span className="text-sm font-normal text-gray-500">/week</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span>Limited Time Access</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span>Life Hacks & Business Hacks</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span>AI-powered Insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span>Progress Tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span>After 7 Days, Buy Standard Plan</span>
                </li>
              </ul>
              <Button
                onClick={() => handlePlanSelection('trial')}
                disabled={isProcessing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Start Free Trial
              </Button>
            </CardContent>
          </Card>

          {/* Standard Plan */}
          <Card
            className={`relative ${selectedPlan === 'basic' ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-black mr-2" />
              </div>
              <CardTitle className="text-2xl">Standard</CardTitle>
              <CardDescription className="text-lg">Ongoing Access</CardDescription>
              <div className="text-3xl font-bold text-black mt-4">
                $20.00
                <span className="text-sm font-normal text-gray-500">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Full Access to All Features</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Exclusive Life Hacks & Business Hacks</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>AI-powered Insights</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Progress Tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  <span>Monthly Meeting Access</span>
                </li>
              </ul>
              <Button
                onClick={() => handlePlanSelection('basic')}
                disabled={isProcessing}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe with PayPal
              </Button>
            </CardContent>
          </Card>

          {/* Premium Coaching Plan */}
          <Card
            className={`relative ${selectedPlan === 'premium' ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-yellow-500 mr-2" />
                <Badge className="bg-yellow-100 text-yellow-800">PREMIUM</Badge>
              </div>
              <CardTitle className="text-2xl">Coaching</CardTitle>
              <CardDescription className="text-lg">Personalized Growth</CardDescription>
              <div className="text-3xl font-bold text-yellow-600 mt-4">
                $250
                <span className="text-sm font-normal text-gray-500">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-yellow-500 mr-3" />
                  <span>Everything in Standard Plan</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-yellow-500 mr-3" />
                  <span>1-on-1 and Group Coaching</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-yellow-500 mr-3" />
                  <span>Custom Goal Setting</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-yellow-500 mr-3" />
                  <span>Personalized Strategies</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-yellow-500 mr-3" />
                  <span>Launch Your Own Lifehack</span>
                </li>
              </ul>
              <Button
                onClick={() => handlePlanSelection('premium')}
                disabled={isProcessing}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Founder
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Inline Forms */}
        {showForm && (
          <div className="w-full mb-12">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-black text-center">
                  {showForm === 'trial' && 'Start Your Free Trial'}
                  {showForm === 'basic' && 'Subscribe to Standard Plan'}
                  {showForm === 'premium' && 'Contact Founder'}
                </CardTitle>
                <CardDescription className="text-center text-gray-600">
                  {showForm === 'trial' && 'Get 7 days of full access to Life Stacks'}
                  {showForm === 'basic' && 'Monthly subscription at $20.00/month'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div
                    className={`grid ${showForm === 'premium' ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 items-end`}
                  >
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-black text-sm">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Enter your full name"
                        className="text-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-black text-sm">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="Enter your email"
                        className="text-black"
                      />
                    </div>

                    {showForm !== 'premium' && (
                      <div className="space-y-1">
                        <Label htmlFor="password" className="text-black text-sm">
                          Password
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          placeholder="Create a password"
                          className="text-black"
                          minLength={6}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className={`flex-1 ${
                          showForm === 'trial'
                            ? 'bg-green-600 hover:bg-green-700'
                            : showForm === 'basic'
                              ? 'bg-black hover:bg-gray-800'
                              : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                      >
                        {isProcessing
                          ? 'Processing...'
                          : showForm === 'premium'
                            ? 'Send It'
                            : 'Get It'}
                      </Button>
                    </div>
                  </div>

                  {showForm === 'premium' && (
                    <div className="space-y-1">
                      <Label htmlFor="message" className="text-black text-sm">
                        Message (Optional)
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell Joseph about your goals and what you're looking for..."
                        className="text-black min-h-[60px]"
                      />
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFAQ(!showFAQ)}
            className="w-full p-8 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-2xl font-bold text-black">Frequently Asked Questions</h2>
            {showFAQ ? (
              <ChevronUp className="h-6 w-6 text-gray-600" />
            ) : (
              <ChevronDown className="h-6 w-6 text-gray-600" />
            )}
          </button>

          <div
            className={`transition-all duration-300 ease-in-out ${
              showFAQ ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}
          >
            <div className="p-8 pt-0">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-black">
                    What happens after my free trial?
                  </h3>
                  <p className="text-gray-600">
                    During your final days, you'll be asked to buy the Standard Plan ($20.00/month).
                    You'll receive email notifications 48 hours prior.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-black">Can I cancel anytime?</h3>
                  <p className="text-gray-600">
                    Yes! You can cancel your subscription at any time. Your access continues until
                    the end of your current billing period.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-black">
                    What's included in Premium Coaching?
                  </h3>
                  <p className="text-gray-600">
                    Premium Coaching includes everything in the Standard Plan plus 1-on-1 coaching
                    sessions, group coaching, personalized strategies, and Founder access and your
                    feedback to improve LifeStacks.ai
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-black">How does billing work?</h3>
                  <p className="text-gray-600">
                    Standard Plan is billed monthly through PayPal. Premium Coaching is managed
                    directly by the founder with custom invoicing and access codes. You can manage
                    your Standard subscription and payment methods directly through your PayPal
                    account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex justify-between items-center mt-8">
          <Link href="/" className="text-white hover:text-gray-300 font-medium">
            ← Back to Home
          </Link>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowRedeemModal(true)}
              className="text-yellow-500 hover:text-yellow-400 font-semibold flex items-center space-x-1"
            >
              <Gift className="h-4 w-4" />
              <span>Redeem</span>
            </button>
            <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-300 text-sm">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Redeem Code Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-lg p-8 max-w-md w-full shadow-2xl border-4 border-yellow-500">
            <div className="text-center mb-6">
              <Gift className="h-12 w-12 text-white mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-white mb-2">Redeem Access Code</h2>
              <p className="text-yellow-100">Enter your code to create a Premium account</p>
            </div>

            <form onSubmit={handleRedeemSubmit} className="space-y-4">
              {/* Access Code Input */}
              <div>
                <Label htmlFor="redeem-code" className="text-white font-semibold">
                  8-Character Access Code
                </Label>
                <Input
                  id="redeem-code"
                  type="text"
                  value={redeemData.code}
                  onChange={(e) =>
                    setRedeemData({ ...redeemData, code: e.target.value.toUpperCase() })
                  }
                  maxLength={8}
                  placeholder="XXXXXXXX"
                  className="bg-white text-black font-mono text-lg tracking-widest text-center uppercase"
                  required
                />
              </div>

              {/* Name Input */}
              <div>
                <Label htmlFor="redeem-name" className="text-white font-semibold">
                  Full Name
                </Label>
                <Input
                  id="redeem-name"
                  type="text"
                  value={redeemData.name}
                  onChange={(e) => setRedeemData({ ...redeemData, name: e.target.value })}
                  placeholder="Your full name"
                  className="bg-white text-black"
                  required
                />
              </div>

              {/* Email Input */}
              <div>
                <Label htmlFor="redeem-email" className="text-white font-semibold">
                  Email Address
                </Label>
                <Input
                  id="redeem-email"
                  type="email"
                  value={redeemData.email}
                  onChange={(e) => setRedeemData({ ...redeemData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-white text-black"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <Label htmlFor="redeem-password" className="text-white font-semibold">
                  Password
                </Label>
                <Input
                  id="redeem-password"
                  type="password"
                  value={redeemData.password}
                  onChange={(e) => setRedeemData({ ...redeemData, password: e.target.value })}
                  placeholder="Create a secure password"
                  className="bg-white text-black"
                  required
                  minLength={6}
                />
              </div>

              {/* Error Message */}
              {redeemError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {redeemError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRedeemModal(false)
                    setRedeemData({ code: '', name: '', email: '', password: '' })
                    setRedeemError('')
                  }}
                  className="flex-1 bg-white text-yellow-700 hover:bg-gray-100 border-2 border-white"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-white text-yellow-700 hover:bg-gray-100 font-bold"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Creating Account...' : 'Redeem & Sign In'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
