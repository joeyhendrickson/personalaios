'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PayPalSubscriptionButton from '@/components/paypal/paypal-subscription-button'
import { Gift, CreditCard, X } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  onCodeSuccess?: (email: string) => void
}

export function PaywallModal({ isOpen, onClose, onCodeSuccess }: PaywallModalProps) {
  const [activeTab, setActiveTab] = useState<'payment' | 'code'>('payment')
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'basic' | 'premium'>('trial')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const { t } = useLanguage()

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      setCodeError('Please enter a code')
      return
    }

    setIsVerifying(true)
    setCodeError('')

    try {
      const response = await fetch('/api/access-codes/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        onCodeSuccess?.(result.email || '')
        onClose()
      } else {
        setCodeError(result.error || 'Invalid code')
      }
    } catch (error) {
      setCodeError('Failed to verify code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleTrialSuccess = async () => {
    // For trial, we'll redirect to signup without payment
    onClose()
    // Redirect to signup with trial plan
    window.location.href = '/signup?plan=trial'
  }

  const handlePaymentSuccess = (details: any) => {
    console.log('Payment successful:', details)
    // Payment success will redirect to signup page with plan info
    onClose()
  }

  const getPlanPrice = () => {
    if (selectedPlan === 'trial') return 0
    return selectedPlan === 'basic' ? 49.99 : 249.99
  }

  const getPlanDescription = () => {
    if (selectedPlan === 'trial') {
      return '7 days free trial, then $49.99/month. Cancel anytime during trial.'
    }
    return selectedPlan === 'basic'
      ? 'Full access to all Life Stacks features and AI-powered tools'
      : 'Everything in Basic plus personal AI coaching and one-on-one guidance'
  }

  const getPlanTitle = () => {
    if (selectedPlan === 'trial') return 'Free Trial'
    return selectedPlan === 'basic' ? 'Basic Plan' : 'Premium Plan'
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Create Your Account
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to create your Life Stacks account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'payment'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="h-4 w-4 inline mr-2" />
              Payment
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'code'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Gift className="h-4 w-4 inline mr-2" />
              Free Code
            </button>
          </div>

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              {/* Plan Selection */}
              <div className="grid grid-cols-1 gap-3">
                {/* Free Trial Plan */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'trial'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan('trial')}
                >
                  <div className="absolute -top-2 left-4 bg-green-500 text-white px-2 py-1 text-xs font-bold rounded">
                    RECOMMENDED
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">Free Trial</h3>
                      <p className="text-sm text-gray-600">7 days free, then $49.99/month</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">FREE</div>
                      <div className="text-sm text-gray-500">7 days</div>
                    </div>
                  </div>
                </div>

                {/* Basic Plan */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPlan === 'basic'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan('basic')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">Basic Plan</h3>
                      <p className="text-sm text-gray-600">
                        Full access to all Life Stacks features
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">$49.99</div>
                      <div className="text-sm text-gray-500">/month</div>
                    </div>
                  </div>
                </div>

                {/* Premium Plan */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPlan === 'premium'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlan('premium')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">Premium Plan</h3>
                      <p className="text-sm text-gray-600">
                        Everything in Basic plus personal AI coaching
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">$249.99</div>
                      <div className="text-sm text-gray-500">/month</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Plan Summary */}
              <div
                className={`p-4 rounded-lg ${
                  selectedPlan === 'trial'
                    ? 'bg-green-50'
                    : selectedPlan === 'basic'
                      ? 'bg-blue-50'
                      : 'bg-purple-50'
                }`}
              >
                <h3 className="font-semibold text-lg mb-2">{getPlanTitle()} Selected</h3>
                <p className="text-sm text-gray-700 mb-3">{getPlanDescription()}</p>
                <div className="text-xl font-bold">
                  {selectedPlan === 'trial' ? (
                    <>
                      FREE
                      <span className="text-sm font-normal text-gray-600"> (7 days)</span>
                    </>
                  ) : (
                    <>
                      ${getPlanPrice()}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </>
                  )}
                </div>
              </div>

              {selectedPlan === 'trial' ? (
                <button
                  onClick={handleTrialSuccess}
                  className="w-full px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-lg"
                >
                  Start Free Trial
                </button>
              ) : selectedPlan === 'basic' ? (
                <PayPalSubscriptionButton
                  planType="standard"
                  userEmail=""
                  onSuccess={() => handlePaymentSuccess({})}
                  onError={handlePaymentError}
                />
              ) : (
                <div className="text-center p-4 text-gray-500">
                  Premium plans are managed through access codes
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by PayPal. Cancel anytime.
              </p>
            </div>
          )}

          {/* Code Tab */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Gift className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-lg text-green-900 mb-2">Free Access Code</h3>
                <p className="text-green-700 text-sm">
                  Have a free access code? Enter it below to create your account.
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="access-code">Access Code</Label>
                  <Input
                    id="access-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter your access code"
                    className="text-center font-mono text-lg tracking-wider"
                    maxLength={20}
                    disabled={isVerifying}
                  />
                </div>

                {codeError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{codeError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isVerifying || !code.trim()}>
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Create Free Account
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-gray-500 text-center">
                Don't have a code? Contact us or try the payment option.
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
