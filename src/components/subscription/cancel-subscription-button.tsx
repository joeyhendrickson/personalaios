'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { X, AlertTriangle, Clock, DollarSign } from 'lucide-react'

interface CancelSubscriptionButtonProps {
  subscriptionId: string
  createdAt: string
  onCancelled?: () => void
}

export default function CancelSubscriptionButton({
  subscriptionId,
  createdAt,
  onCancelled,
}: CancelSubscriptionButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  // Calculate hours since creation
  const subscriptionDate = new Date(createdAt)
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60)
  const isEligibleForRefund = hoursSinceCreation <= 24

  const handleCancel = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          reason: 'User requested cancellation',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription')
      }

      if (result.refundRequestCreated) {
        alert(
          `✅ Subscription cancelled! Your refund request has been submitted for admin approval. Request ID: ${result.refundRequestId}`
        )
      } else {
        alert('✅ Subscription cancelled successfully')
      }

      setShowDialog(false)
      onCancelled?.()
    } catch (error) {
      console.error('Cancellation error:', error)
      alert(
        `❌ Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <X className="h-4 w-4 mr-2" />
          Cancel Subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Cancel Subscription
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your subscription? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Refund Information */}
          <Card
            className={
              isEligibleForRefund
                ? 'border-green-200 bg-green-50'
                : 'border-orange-200 bg-orange-50'
            }
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-sm flex items-center ${isEligibleForRefund ? 'text-green-800' : 'text-orange-800'}`}
              >
                {isEligibleForRefund ? (
                  <DollarSign className="h-4 w-4 mr-2" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                {isEligibleForRefund ? 'Refund Eligible' : 'Refund Window Expired'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription
                className={`text-xs ${isEligibleForRefund ? 'text-green-600' : 'text-orange-600'}`}
              >
                {isEligibleForRefund ? (
                  <>
                    ✅ You're eligible for a full refund!
                    <br />
                    Subscription created {Math.round(hoursSinceCreation * 100) / 100} hours ago
                    (within 24-hour window)
                  </>
                ) : (
                  <>
                    ⚠️ Refund window expired
                    <br />
                    Subscription created {Math.round(hoursSinceCreation * 100) / 100} hours ago
                    (over 24-hour limit)
                  </>
                )}
              </CardDescription>
            </CardContent>
          </Card>

          {/* Cancellation Details */}
          <div className="text-sm text-gray-600">
            <p>
              <strong>What happens when you cancel:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your subscription will be cancelled immediately</li>
              <li>You'll lose access to premium features</li>
              {isEligibleForRefund && (
                <li className="text-green-600 font-semibold">
                  A refund request will be submitted for admin approval
                </li>
              )}
              <li>Your account data will be preserved</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isProcessing}
            className="bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cancelling...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                {isEligibleForRefund ? 'Cancel & Refund' : 'Cancel Subscription'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
