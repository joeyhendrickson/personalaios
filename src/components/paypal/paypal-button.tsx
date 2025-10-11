'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PayPalButtonProps {
  amount: number
  currency?: string
  description: string
  planType?: string
  onSuccess?: (details: any) => void
  onError?: (error: any) => void
  className?: string
}

declare global {
  interface Window {
    paypal?: any
  }
}

export function PayPalButton({ 
  amount, 
  currency = 'USD', 
  description, 
  planType = 'basic',
  onSuccess, 
  onError,
  className = ''
}: PayPalButtonProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadPayPalScript = () => {
      const script = document.createElement('script')
      script.src = 'https://www.paypal.com/sdk/js?client-id=' + process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
      script.async = true
      script.onload = () => {
        setIsLoaded(true)
      }
      script.onerror = () => {
        console.error('Failed to load PayPal SDK')
        onError?.({ message: 'Failed to load PayPal' })
      }
      document.body.appendChild(script)
    }

    if (!window.paypal) {
      loadPayPalScript()
    } else {
      setIsLoaded(true)
    }

    return () => {
      // Cleanup if needed
    }
  }, [onError])

  useEffect(() => {
    if (isLoaded && window.paypal) {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal'
        },
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: amount.toFixed(2),
                currency_code: currency
              },
              description: description
            }]
          })
        },
        onApprove: async (data: any, actions: any) => {
          try {
            setIsProcessing(true)
            const details = await actions.order.capture()
            
            // Send payment confirmation to your API
            const response = await fetch('/api/payment/verify-paypal', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderID: data.orderID,
                details: details,
                planType: planType
              })
            })

            if (response.ok) {
              const result = await response.json()
              onSuccess?.(details)
              
              // Redirect to account creation with payment confirmation
              router.push(`/signup?payment=success&order=${data.orderID}`)
            } else {
              throw new Error('Payment verification failed')
            }
          } catch (error) {
            console.error('Payment error:', error)
            onError?.(error)
          } finally {
            setIsProcessing(false)
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err)
          onError?.(err)
          setIsProcessing(false)
        }
      }).render('#paypal-button-container')
    }
  }, [isLoaded, amount, currency, description, onSuccess, onError, router])

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading PayPal...</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <div id="paypal-button-container"></div>
      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Processing payment...</p>
        </div>
      )}
    </div>
  )
}
