'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, MapPin, Check, ExternalLink, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PayPalOneTimeButton from '@/components/paypal/paypal-one-time-button'
import {
  WORKSHOP_CHECK_IN,
  WORKSHOP_CHECKOUT,
  WORKSHOP_DATES,
  WORKSHOP_FACILITATOR,
  WORKSHOP_HOST,
  WORKSHOP_ID_EMAIL,
  WORKSHOP_LOCATION,
  WORKSHOP_LOCATION_SHORT,
  WORKSHOP_PAYPAL_VALUE,
  WORKSHOP_PRICE_DISPLAY,
  WORKSHOP_TITLE,
} from '@/lib/workshop/constants'

export default function WorkshopPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    onSiteStay: false,
    acceptedTerms: false,
  })
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const formValid = formData.name.trim() && formData.email.trim() && formData.acceptedTerms

  const handlePaymentSuccess = () => {
    setRegistrationComplete(true)
    setPaymentError('')
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-black text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Registration Complete!</h1>
          <p className="text-gray-300 mb-6">
            Thank you for registering for the Lifestacks Workshop. Your payment of{' '}
            {WORKSHOP_PRICE_DISPLAY} has been received.
          </p>
          <Card className="bg-white text-black text-left mb-8">
            <CardHeader>
              <CardTitle>Next Step: Verify Your Identity</CardTitle>
              <CardDescription>
                Registration is not complete until we receive your government-issued photo ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Email a clear, legible copy or photograph of your ID to:</p>
              <a
                href={`mailto:${WORKSHOP_ID_EMAIL}?subject=Lifestacks Workshop ID Verification&body=Hi, please find my government-issued photo ID attached for workshop registration verification.%0D%0A%0D%0AName: ${encodeURIComponent(formData.name)}%0D%0AEmail: ${encodeURIComponent(formData.email)}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
              >
                <Mail className="h-4 w-4" />
                {WORKSHOP_ID_EMAIL}
              </a>
            </CardContent>
          </Card>
          <Link href="/create-account" className="text-gray-400 hover:text-white">
            ← Back to Create Account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/create-account"
          className="inline-flex items-center text-gray-300 hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Create Account
        </Link>

        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden mb-8 border border-yellow-600/30">
          <Image
            src="/workshop-banner.png"
            alt="9-Day Lifestacks Workshop in Columbus, Ohio — $649 registration"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">{WORKSHOP_TITLE}</h1>
          <p className="text-xl text-yellow-500 font-semibold mb-2">
            {WORKSHOP_PRICE_DISPLAY} Registration
          </p>
          <p className="text-gray-300">Hosted by {WORKSHOP_HOST}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card className="bg-white text-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-600" />
                Dates & Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Workshop Dates:</span> {WORKSHOP_DATES}
              </p>
              <p>
                <span className="font-semibold">Check-In:</span> {WORKSHOP_CHECK_IN}
              </p>
              <p>
                <span className="font-semibold">Checkout:</span> {WORKSHOP_CHECKOUT}
              </p>
              <p>
                <span className="font-semibold">Facilitator:</span> {WORKSHOP_FACILITATOR}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white text-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-yellow-600" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Area:</span> {WORKSHOP_LOCATION_SHORT}
              </p>
              <p>
                <span className="font-semibold">Address:</span> {WORKSHOP_LOCATION}
              </p>
              <p className="text-gray-600 mt-3">
                Optional on-site lodging available in a furnished basement suite during the workshop
                period.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white text-black mb-8">
          <CardHeader>
            <CardTitle>What&apos;s Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                '9 days of Lifestacks platform access and individualized coaching',
                'Flexible coaching sessions (in person, phone, video, email, text, or platform)',
                'Hands-on setup and configuration of your Lifestacks system',
                'Optional on-site stay with furnished basement suite amenities',
                'Reserved garage parking space #5 (if staying on-site)',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white text-black">
          <CardHeader>
            <CardTitle>Register & Pay</CardTitle>
            <CardDescription>
              Complete the form below, review the terms, and pay {WORKSHOP_PRICE_DISPLAY} via PayPal
              to secure your spot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="workshop-name">Full Name</Label>
                <Input
                  id="workshop-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full legal name"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="workshop-email">Email</Label>
                <Input
                  id="workshop-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="workshop-phone">Phone (Optional)</Label>
                <Input
                  id="workshop-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="workshop-onsite"
                  type="checkbox"
                  checked={formData.onSiteStay}
                  onChange={(e) => setFormData({ ...formData, onSiteStay: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="workshop-onsite" className="font-normal cursor-pointer">
                  I am interested in optional on-site lodging
                </Label>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex items-start gap-2">
                <input
                  id="workshop-terms"
                  type="checkbox"
                  checked={formData.acceptedTerms}
                  onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 mt-1"
                  required
                />
                <Label htmlFor="workshop-terms" className="font-normal cursor-pointer">
                  I have read and agree to the Lifestacks Workshop Registration Agreement and Terms
                  & Conditions.
                </Label>
              </div>
              <Button type="button" variant="outline" size="sm" asChild className="gap-2">
                <a href="/workshop/terms" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View Terms
                </a>
              </Button>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {paymentError}
              </div>
            )}

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-lg">Registration Total</span>
                <span className="text-2xl font-bold text-yellow-600">{WORKSHOP_PRICE_DISPLAY}</span>
              </div>

              {formValid ? (
                <PayPalOneTimeButton
                  amount={WORKSHOP_PAYPAL_VALUE}
                  description="Lifestacks Workshop Registration — July 29 to August 7, 2026"
                  userEmail={formData.email}
                  metadata={{
                    name: formData.name,
                    phone: formData.phone,
                    onSiteStay: formData.onSiteStay,
                    acceptedTerms: formData.acceptedTerms,
                  }}
                  onSuccess={handlePaymentSuccess}
                  onError={(error) => {
                    if (error !== 'Payment cancelled') {
                      setPaymentError(error)
                    }
                  }}
                />
              ) : (
                <div className="w-full p-4 border border-gray-200 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                  Fill out the form and accept the terms to enable PayPal payment.
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center">
              After payment, email your government-issued photo ID to {WORKSHOP_ID_EMAIL} to
              complete registration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
