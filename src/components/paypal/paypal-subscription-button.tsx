'use client'

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { useEffect, useState } from 'react'

interface PayPalSubscriptionButtonProps {
  planType: 'standard' | 'premium'
  userEmail: string
  userId?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function PayPalSubscriptionButton({
  planType,
  userEmail,
  userId,
  onSuccess,
  onError,
}: PayPalSubscriptionButtonProps) {
  const [clientId, setClientId] = useState<string>('')
  const [planId, setPlanId] = useState<string>('')

  useEffect(() => {
    // Get PayPal credentials from environment
    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const standardPlanId = process.env.NEXT_PUBLIC_PAYPAL_BASIC_PLAN_ID // This is actually the Standard plan ID
    const premiumPlanId = process.env.NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID

    console.log('PayPal Config:', { paypalClientId, standardPlanId, premiumPlanId, planType })

    if (!paypalClientId) {
      console.error('PayPal Client ID not found')
      onError?.('PayPal configuration missing')
      return
    }

    setClientId(paypalClientId)
    setPlanId(planType === 'premium' ? premiumPlanId || '' : standardPlanId || '')
  }, [planType, onError])

  if (!clientId || !planId) {
    return (
      <div className="w-full p-4 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 font-semibold">PayPal Configuration Missing</p>
        <p className="text-sm text-red-500 mt-1">Client ID: {clientId ? 'Found' : 'Missing'}</p>
        <p className="text-sm text-red-500 mt-1">Plan ID: {planId ? 'Found' : 'Missing'}</p>
        <p className="text-sm text-red-500 mt-1">Plan Type: {planType}</p>
      </div>
    )
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        vault: true,
        intent: 'subscription',
        currency: 'USD',
      }}
    >
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'subscribe',
        }}
        createSubscription={(data, actions) => {
          console.log('Creating PayPal subscription for plan:', planId)
          return actions.subscription.create({
            plan_id: planId,
            subscriber: {
              email_address: userEmail,
            },
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              return_url: `${window.location.origin}/dashboard?subscription=success`,
              cancel_url: `${window.location.origin}/subscribe?cancelled=true`,
            },
          })
        }}
        onApprove={async (data, actions) => {
          console.log('✅ PayPal subscription approved!')
          console.log('Subscription ID:', data.subscriptionID)
          console.log('Order ID:', data.orderID)

          // Store subscription ID in your database immediately
          try {
            const response = await fetch('/api/subscriptions/link-paypal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paypal_subscription_id: data.subscriptionID,
                email: userEmail,
                user_id: userId,
                plan_type: planType === 'premium' ? 'premium' : 'standard',
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to link subscription')
            }

            console.log('✅ Subscription linked to user account')
            onSuccess?.()
          } catch (error) {
            console.error('Error linking subscription:', error)
            onError?.(error instanceof Error ? error.message : 'Failed to link subscription')
          }

          return Promise.resolve()
        }}
        onCancel={() => {
          console.log('❌ User cancelled PayPal subscription')
          onError?.('Subscription cancelled')
        }}
        onError={(err) => {
          console.error('❌ PayPal subscription error:', err)
          onError?.(typeof err === 'string' ? err : 'Payment processing failed')
        }}
      />
    </PayPalScriptProvider>
  )
}
