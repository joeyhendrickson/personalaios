'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/contexts/language-context'
import { useAdminAuth } from '@/hooks/use-admin-auth'

interface TrialStatusBannerProps {
  email: string
}

export default function TrialStatusBanner({ email }: TrialStatusBannerProps) {
  const { t } = useLanguage()
  const { isAdmin } = useAdminAuth()
  const [trialStatus, setTrialStatus] = useState<{
    daysRemaining: number
    status: string
    isExpired: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // SECURITY CHECK: Never fetch trial status for admin users
    if (isAdmin) {
      return
    }

    const fetchTrialStatus = async () => {
      try {
        const response = await fetch(`/api/trial/create?email=${encodeURIComponent(email)}`)
        const data = await response.json()

        if (data.success && data.trial) {
          const now = new Date()
          const trialEnd = new Date(data.trial.trial_end)
          const daysRemaining = Math.ceil(
            (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )

          setTrialStatus({
            daysRemaining: Math.max(0, daysRemaining),
            status: data.trial.status,
            isExpired: now >= trialEnd,
          })
        }
      } catch (error) {
        console.error('Error fetching trial status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrialStatus()
  }, [email, isAdmin])

  // SECURITY CHECK: Never show trial banner for admin users
  if (isAdmin || loading || !trialStatus) {
    return null
  }

  // Don't show banner if trial is expired
  if (trialStatus.isExpired) {
    return (
      <Card className="mb-6 border-red-500 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">{t('trial.expired')}</h3>
                <p className="text-sm text-red-700">{t('trial.expiredMessage')}</p>
              </div>
            </div>
            <Link href="/create-account">
              <Button className="bg-red-600 hover:bg-red-700">
                <CreditCard className="h-4 w-4 mr-2" />
                {t('trial.upgradeNow')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't show banner if more than 7 days remaining
  if (trialStatus.daysRemaining > 7) {
    return null
  }

  // Show warning banner for trials expiring soon
  if (trialStatus.daysRemaining <= 2) {
    return (
      <Card className="mb-6 border-orange-500 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-900">
                  {trialStatus.daysRemaining === 0
                    ? t('trial.expiresToday')
                    : trialStatus.daysRemaining === 1
                      ? t('trial.expiresTomorrow')
                      : t('trial.expiresInDays', { days: trialStatus.daysRemaining })}
                </h3>
                <p className="text-sm text-orange-700">{t('trial.upgradeMessage')}</p>
              </div>
            </div>
            <Link href="/create-account">
              <Button className="bg-orange-600 hover:bg-orange-700">
                <CreditCard className="h-4 w-4 mr-2" />
                {t('trial.upgradePrice')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show info banner for trials with 3-7 days remaining
  return (
    <Card className="mb-6 border-blue-500 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">{t('trial.active')}</h3>
              <p className="text-sm text-blue-700">
                {t('trial.daysRemaining', { days: trialStatus.daysRemaining })}
              </p>
            </div>
          </div>
          <Link href="/create-account">
            <Button
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('trial.upgradeNow')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
