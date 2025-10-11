'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Star, Mail, CreditCard, Zap } from 'lucide-react'
import Link from 'next/link'

export default function CreateAccountPage() {
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'basic' | 'premium'>('trial')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showForm, setShowForm] = useState<'trial' | 'basic' | 'premium' | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })

  const handlePlanSelection = (plan: 'trial' | 'basic' | 'premium') => {
    setSelectedPlan(plan)
    setShowForm(plan)
    setFormData({ name: '', email: '', message: '' })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      if (showForm === 'trial') {
        // Create trial account
        const response = await fetch('/api/trial/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            plan_type: 'basic',
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create trial account')
        }

        // Also create the user account
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: 'temp123', // Temporary password, user will set their own
            name: formData.name,
          }),
        })

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json()
          throw new Error(errorData.error || 'Failed to create account')
        }

        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else if (showForm === 'basic') {
        // Create account first, then redirect to PayPal payment
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: 'temp123', // Temporary password
            name: formData.name,
          }),
        })

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json()
          throw new Error(errorData.error || 'Failed to create account')
        }

        // Redirect to PayPal checkout page with user info
        const params = new URLSearchParams({
          email: formData.email,
          name: formData.name,
          plan: 'basic',
          amount: '19.99',
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
      alert(error.message)
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
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Direct your life and build your focus with our AI-driven Personal OS. Start your
            transformation with the plan that's right for you.
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
                {showForm === 'trial' ? 'Show Details' : 'Start Free Trial'}
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
                $19.99
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
                {showForm === 'basic' ? 'Show Details' : 'Subscribe with PayPal'}
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
                  {showForm === 'basic' && 'Monthly subscription at $19.99/month'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 items-end">
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
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-bold text-center mb-8 text-black">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-black">
                What happens after my free trial?
              </h3>
              <p className="text-gray-600">
                During your final days, you'll be asked to buy the Standard Plan ($19.99/month).
                You'll receive email notifications 48 hours prior.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-black">Can I cancel anytime?</h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. Your access continues until the
                end of your current billing period.
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
              <h3 className="font-semibold text-lg mb-2 text-black">
                How does PayPal billing work?
              </h3>
              <p className="text-gray-600">
                For Standard and Premium, your subscription is billed monthly through PayPal. You
                can manage your subscription and payment methods directly through your PayPal
                account.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex justify-between items-center mt-8">
          <Link href="/" className="text-white hover:text-gray-300 font-medium">
            ← Back to Home
          </Link>
          <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-300 text-sm">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
