'use client'

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import { useEffect, useState } from 'react'

interface PayPalOneTimeButtonProps {
  amount: string
  description: string
  userEmail: string
  metadata?: Record<string, string | boolean>
  disabled?: boolean
  onSuccess?: (orderId: string) => void
  onError?: (error: string) => void
}

export default function PayPalOneTimeButton({
  amount,
  description,
  userEmail,
  metadata,
  disabled = false,
  onSuccess,
  onError,
}: PayPalOneTimeButtonProps) {
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!paypalClientId) {
      onError?.('PayPal configuration missing')
      return
    }
    setClientId(paypalClientId)
  }, [onError])

  if (!clientId) {
    return (
      <div className="w-full p-4 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 font-semibold">PayPal Configuration Missing</p>
      </div>
    )
  }

  if (disabled) {
    return (
      <div className="w-full p-4 border border-gray-200 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
        Complete the registration form and accept the terms to enable payment.
      </div>
    )
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      <PayPalButtons
        style={{
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
        }}
        disabled={disabled}
        createOrder={async () => {
          const response = await fetch('/api/paypal/create-workshop-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount,
              description,
              userEmail,
              metadata,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create PayPal order')
          }

          const { orderID } = await response.json()
          return orderID
        }}
        onApprove={async (data) => {
          try {
            const response = await fetch('/api/workshop/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderID: data.orderID,
                userEmail,
                metadata,
              }),
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to complete registration')
            }

            onSuccess?.(data.orderID || '')
          } catch (error) {
            onError?.(error instanceof Error ? error.message : 'Payment processing failed')
          }
        }}
        onCancel={() => {
          onError?.('Payment cancelled')
        }}
        onError={(err) => {
          onError?.(typeof err === 'string' ? err : 'Payment processing failed')
        }}
      />
    </PayPalScriptProvider>
  )
}
