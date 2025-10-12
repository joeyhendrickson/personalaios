'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, CreditCard, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    paypal?: any
  }
}

export default function PayPalCheckout() {
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const plan = searchParams.get('plan')
  const amount = searchParams.get('amount')

  useEffect(() => {
    // Load PayPal SDK
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture`
    script.async = true
    script.onload = () => setPaypalLoaded(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (!paypalLoaded || !window.paypal) return

    // Render PayPal buttons
    window.paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'paypal',
        },
        createOrder: async (data: any, actions: any) => {
          setIsProcessing(true)
          try {
            // Create order on your server
            const response = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planType: plan,
                userEmail: email,
                amount: amount,
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to create order')
            }

            const { orderID } = await response.json()
            return orderID
          } catch (error) {
            console.error('Error creating order:', error)
            throw error
          }
        },
        onApprove: async (data: any, actions: any) => {
          try {
            // Capture the payment
            const response = await fetch('/api/payment/verify-paypal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderID: data.orderID,
                userEmail: email,
                planType: plan,
              }),
            })

            if (!response.ok) {
              throw new Error('Payment verification failed')
            }

            // Create user account after successful payment
            const signupResponse = await fetch('/api/auth/signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                password: `LS_${Date.now()}_${Math.random().toString(36)}`, // Random password
                name: name,
              }),
            })

            if (!signupResponse.ok) {
              console.error('Failed to create user account, but payment succeeded')
              // Continue anyway - they can contact support
            }

            // Create subscription record
            await fetch('/api/subscriptions/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                plan_type: plan,
                amount: amount,
                status: 'active',
              }),
            })

            // Redirect to login page with success message
            window.location.href = '/login?payment=success&email=' + encodeURIComponent(email || '')
          } catch (error) {
            console.error('Payment error:', error)
            alert('Payment failed. Please try again.')
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err)
          alert('Payment error occurred. Please try again.')
          setIsProcessing(false)
        },
      })
      .render('#paypal-button-container')
  }, [paypalLoaded, email, name, plan, amount])

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
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

        {/* Order Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-semibold">Standard Plan</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold">${amount}/month</span>
            </div>
            <div className="flex justify-between">
              <span>Account:</span>
              <span className="font-semibold">{email}</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${amount}/month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Full Access to All Features</span>
              </li>
              <li className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Exclusive Life Hacks & Business Hacks</span>
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
                <span>Monthly Meeting Access</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* PayPal Button */}
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              Click the PayPal button below to complete your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id="paypal-button-container" className="min-h-[50px]">
              {!paypalLoaded && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="mt-2 text-gray-300">Loading PayPal...</p>
                </div>
              )}
            </div>
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
