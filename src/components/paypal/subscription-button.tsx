'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface PayPalSubscriptionButtonProps {
  planType: 'basic' | 'premium'
  userEmail: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function PayPalSubscriptionButton({ 
  planType, 
  userEmail, 
  onSuccess, 
  onError 
}: PayPalSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    
    try {
      // Step 1: Create setup token
      const setupResponse = await fetch('/api/paypal/create-setup-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType, userEmail })
      })
      
      if (!setupResponse.ok) {
        throw new Error('Failed to create setup token')
      }
      
      const { setupToken } = await setupResponse.json()
      
      // Step 2: Redirect to PayPal for setup
      // This would normally redirect to PayPal's setup page
      // For now, we'll simulate the process
      
      // Step 3: After PayPal setup, create payment token
      const paymentResponse = await fetch('/api/paypal/create-payment-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken: setupToken.id })
      })
      
      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment token')
      }
      
      const { paymentToken } = await paymentResponse.json()
      
      // Step 4: Create order
      const orderResponse = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentTokenId: paymentToken.id,
          planType,
          userEmail
        })
      })
      
      if (!orderResponse.ok) {
        throw new Error('Failed to create order')
      }
      
      const { order } = await orderResponse.json()
      
      onSuccess?.()
      
    } catch (error: any) {
      console.error('Subscription error:', error)
      onError?.(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const planName = planType === 'premium' ? 'Life Stacks Premium' : 'Life Stacks Basic'
  const price = planType === 'premium' ? '$249.99' : '$19.99'

  return (
    <Button 
      onClick={handleSubscribe}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Processing...' : `Subscribe to ${planName} - ${price}/month`}
    </Button>
  )
}
