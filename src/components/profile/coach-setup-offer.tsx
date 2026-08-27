'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Video, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PayPalOneTimeButton from '@/components/paypal/paypal-one-time-button'
import {
  COACH_SETUP_CONTACT_EMAIL,
  COACH_SETUP_INCLUDES,
  COACH_SETUP_PAYPAL_VALUE,
  COACH_SETUP_PRICE_DISPLAY,
  COACH_SETUP_SUBTITLE,
  COACH_SETUP_TITLE,
} from '@/lib/coach-setup/constants'

type CoachSetupOfferProps = {
  userId: string
  userEmail: string
  defaultName?: string
}

export default function CoachSetupOffer({
  userId,
  userEmail,
  defaultName = '',
}: CoachSetupOfferProps) {
  const [expanded, setExpanded] = useState(false)
  const [alreadyBooked, setAlreadyBooked] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [formData, setFormData] = useState({
    name: defaultName,
    email: userEmail,
    phone: '',
    focusNotes: '',
    acceptedTerms: false,
  })

  useEffect(() => {
    setFormData((prev) => ({ ...prev, email: userEmail }))
  }, [userEmail])

  useEffect(() => {
    let cancelled = false
    async function loadStatus() {
      try {
        const res = await fetch('/api/coach-setup/status')
        const data = await res.json()
        if (!cancelled && data.booked) setAlreadyBooked(true)
      } catch {
        /* ignore */
      }
    }
    void loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const formValid = formData.name.trim() && formData.email.trim() && formData.acceptedTerms

  if (alreadyBooked || bookingComplete) {
    return (
      <Card className="border-[hsl(var(--brand-gold-200))] bg-gradient-to-br from-[hsl(var(--brand-gold-50))] via-white to-[hsl(var(--brand-gold-100))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold">
            <Check className="h-5 w-5 text-green-600" />
            Coach session booked
          </CardTitle>
          <CardDescription>
            {bookingComplete
              ? `Payment received — we will email you at ${formData.email} to schedule your 1-on-1 session.`
              : `You have an active coach setup booking. We will contact you at ${userEmail} to schedule your session.`}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-[hsl(var(--brand-gold-200))] bg-gradient-to-br from-[hsl(var(--brand-gold-50))] via-white to-[hsl(var(--brand-gold-100))] overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Sparkles className="h-5 w-5 text-gold" />
              {COACH_SETUP_TITLE}
            </CardTitle>
            <CardDescription className="text-[hsl(var(--brand-gold-700))]">
              {COACH_SETUP_SUBTITLE}
            </CardDescription>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-gold">{COACH_SETUP_PRICE_DISPLAY}</p>
            <p className="text-xs text-gold">one-time</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
          {COACH_SETUP_INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 text-sm text-[hsl(var(--brand-gold-700))] bg-[hsl(var(--brand-gold-50))] rounded-lg px-3 py-2">
          <Video className="h-4 w-4 shrink-0" />
          <span>Private video or phone call — up to 1 hour with a Lifestacks coach</span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full border-[hsl(var(--brand-gold-200))] text-gold hover:bg-[hsl(var(--brand-gold-50))]"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide checkout
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Book your session — {COACH_SETUP_PRICE_DISPLAY}
            </>
          )}
        </Button>

        {expanded && (
          <div className="border border-[hsl(var(--brand-gold-200))] rounded-lg bg-white p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="coach-name">Full name</Label>
                <Input
                  id="coach-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coach-email">Email</Label>
                <Input
                  id="coach-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coach-phone">Phone (optional)</Label>
                <Input
                  id="coach-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="For scheduling"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="coach-focus">What should we focus on? (optional)</Label>
                <textarea
                  id="coach-focus"
                  value={formData.focusNotes}
                  onChange={(e) => setFormData({ ...formData, focusNotes: e.target.value })}
                  placeholder="Goals, modules, or areas where you want hands-on setup help..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                id="coach-terms"
                type="checkbox"
                checked={formData.acceptedTerms}
                onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 mt-1"
              />
              <Label htmlFor="coach-terms" className="font-normal text-sm cursor-pointer">
                I agree to purchase a one-time Lifestacks coach session ({COACH_SETUP_PRICE_DISPLAY}
                ) and understand scheduling details will be sent to my email.
              </Label>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {paymentError}
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-gold">{COACH_SETUP_PRICE_DISPLAY}</span>
              </div>

              {formValid ? (
                <PayPalOneTimeButton
                  amount={COACH_SETUP_PAYPAL_VALUE}
                  description="Lifestacks Personalized AI Setup & Coach Session (1 hour)"
                  userEmail={formData.email}
                  registerEndpoint="/api/coach-setup/register"
                  orderContext={{
                    customIdPrefix: 'coach_setup',
                    returnUrl:
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/profile?coach_setup=success`
                        : undefined,
                    cancelUrl:
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/profile?coach_setup=cancelled`
                        : undefined,
                  }}
                  metadata={{
                    name: formData.name,
                    phone: formData.phone,
                    focusNotes: formData.focusNotes,
                    acceptedTerms: formData.acceptedTerms,
                    userId,
                  }}
                  onSuccess={() => {
                    setBookingComplete(true)
                    setPaymentError('')
                    setExpanded(false)
                  }}
                  onError={(error) => {
                    if (error !== 'Payment cancelled') setPaymentError(error)
                  }}
                />
              ) : (
                <div className="w-full p-4 border border-gray-200 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                  Complete the form and accept the terms to pay with PayPal.
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              Questions? Email{' '}
              <a href={`mailto:${COACH_SETUP_CONTACT_EMAIL}`} className="text-gold underline">
                {COACH_SETUP_CONTACT_EMAIL}
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
