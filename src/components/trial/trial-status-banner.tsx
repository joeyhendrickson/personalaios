'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, CreditCard, X } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

interface TrialData {
  id: string
  email: string
  trial_start: string
  trial_end: string
  status: string
  will_convert_to: string
  conversion_price: number
}

export function TrialStatusBanner() {
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (user?.email) {
      fetchTrialStatus()
    }
  }, [user])

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch(`/api/trial/create?email=${encodeURIComponent(user?.email || '')}`)
      const result = await response.json()
      
      if (result.success && result.isActive) {
        setTrialData(result.trial)
        setDaysRemaining(result.daysRemaining)
      }
    } catch (error) {
      console.error('Error fetching trial status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    // Redirect to upgrade page or show payment modal
    window.location.href = '/upgrade'
  }

  const handleCancel = async () => {
    // Cancel trial - redirect to cancellation page
    window.location.href = '/cancel-trial'
  }

  if (loading || !trialData || !daysRemaining) {
    return null
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-6">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Free Trial Active</strong>
            <p className="text-sm mt-1">
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your free trial. 
              After {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}, you'll be charged ${trialData.conversion_price}/month for the {trialData.will_convert_to} plan.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Upgrade Now
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCancel}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
