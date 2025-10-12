'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Loader2 } from 'lucide-react'

export default function TrialWelcome() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'creating' | 'success' | 'error'>('creating')
  const [message, setMessage] = useState('Setting up your free trial...')

  const email = searchParams.get('email')
  const name = searchParams.get('name')

  useEffect(() => {
    const createAccount = async () => {
      try {
        // Create user account
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            password: `LS_TRIAL_${Date.now()}_${Math.random().toString(36)}`,
            name: name,
          }),
        })

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json()

          // If user already exists, that's okay
          if (errorData.error?.includes('already') || errorData.existing) {
            setStatus('success')
            setMessage('Your trial account is ready!')
            setTimeout(() => {
              window.location.href = `/login?trial=active&email=${encodeURIComponent(email || '')}`
            }, 2000)
            return
          }

          throw new Error(errorData.error || 'Failed to create account')
        }

        setStatus('success')
        setMessage('Your trial account is ready!')
        setTimeout(() => {
          window.location.href = `/login?trial=active&email=${encodeURIComponent(email || '')}`
        }, 2000)
      } catch (error) {
        console.error('Account creation error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Failed to create trial account')
      }
    }

    if (email) {
      createAccount()
    }
  }, [email, name])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {/* Stacked layers icon */}
            <div className="flex flex-col space-y-1.5">
              <div className="w-16 h-5 bg-white rounded-md shadow-lg"></div>
              <div className="w-16 h-5 bg-white rounded-md shadow-lg"></div>
              <div className="w-16 h-5 bg-white rounded-md shadow-lg"></div>
            </div>
            {/* Life Stacks text */}
            <div className="text-left">
              <div className="text-3xl font-bold text-white leading-none tracking-tight">Life</div>
              <div className="text-3xl font-bold text-white leading-none tracking-tight">
                Stacks
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome to Your Free Trial!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {status === 'creating' && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="text-gray-600">{message}</p>
                <div className="text-sm text-gray-500">
                  You'll receive a password reset email to set up your account.
                  <br />
                  Redirecting to login...
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <p className="text-red-600">{message}</p>
                <a
                  href="/create-account"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-gray-400 text-sm space-y-2">
          <p>✨ Your 7-day free trial includes:</p>
          <ul className="space-y-1">
            <li>Full access to all features</li>
            <li>Life Hacks & Business Hacks</li>
            <li>AI-powered insights</li>
            <li>Progress tracking</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
