'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PayPalSubscriptionButton from '@/components/paypal/paypal-subscription-button'

export default function PayPalCheckout() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const plan = searchParams.get('plan') || 'standard'
  const amount = searchParams.get('amount') || '20.00'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-6">
            {/* Stacked layers icon */}
            <div className="flex flex-col space-y-2">
              <div className="w-20 h-6 bg-white rounded-lg shadow-lg"></div>
              <div className="w-20 h-6 bg-white rounded-lg shadow-lg"></div>
              <div className="w-20 h-6 bg-white rounded-lg shadow-lg"></div>
            </div>
            {/* Life Stacks text */}
            <div className="text-left">
              <div className="text-4xl font-bold text-white leading-none tracking-tight">Life</div>
              <div className="text-4xl font-bold text-white leading-none tracking-tight">
                Stacks
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/create-account"
            className="inline-flex items-center text-gray-300 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plans
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Complete Your Payment</h1>
          <p className="text-gray-300">Secure payment powered by PayPal</p>
        </div>

        {/* Payment Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold">${amount}/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Account:</span>
              <span className="font-semibold">{email}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total:</span>
                <span className="font-bold">${amount}/month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Full Access to All Features
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Exclusive Life Hacks & Business Hacks
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                AI-powered Insights
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Progress Tracking
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Monthly Meeting Access
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Click the PayPal button below to complete your subscription
            </p>

            {email ? (
              <PayPalSubscriptionButton
                planType="standard"
                userEmail={email}
                onSuccess={() => {
                  console.log('Payment successful!')
                  // Redirect to dashboard after successful payment
                  window.location.href = '/dashboard?subscription=success'
                }}
                onError={(error) => {
                  console.error('Payment error:', error)
                  alert(`Payment failed: ${error}`)
                }}
              />
            ) : (
              <div className="text-center p-4 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-red-600">Email address is required for payment</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>🔒 Your payment information is secure and encrypted</p>
          <p>You can cancel your subscription anytime from your account settings</p>
        </div>
      </div>
    </div>
  )
}
