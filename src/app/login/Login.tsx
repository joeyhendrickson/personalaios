'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/auth-context'
import { ArrowLeft, UserPlus, LogIn, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for trial success message or password reset success
  useEffect(() => {
    const trial = searchParams.get('trial')
    const emailParam = searchParams.get('email')
    const passwordReset = searchParams.get('passwordReset')

    if (trial === 'success' && emailParam) {
      setEmail(emailParam)
      setSuccessMessage(
        'Trial account created successfully! Please sign in with your email and password.'
      )
    } else if (passwordReset === 'success') {
      setSuccessMessage('Password reset successful! Please sign in with your new password.')
    }
  }, [searchParams])

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault()

    if (!email) {
      setResetError('Please enter your email address first')
      return
    }

    setIsSendingReset(true)
    setResetError('')
    setResetEmailSent(false)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email')
      }

      setResetEmailSent(true)
      setResetError('')
    } catch (error: any) {
      console.error('Error sending reset email:', error)
      setResetError(error.message || 'Failed to send password reset email. Please try again.')
      setResetEmailSent(false)
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        await signUp(email, password)
        setError('')
        // Show success message for signup
        alert('Account created successfully! Please check your email to verify your account.')
      } else {
        await signIn(email, password)
        // Redirect to dashboard on successful login
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Login/Signup Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {isSignUp ? (
                <UserPlus className="h-6 w-6 text-blue-600" />
              ) : (
                <LogIn className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Create your Personal AI OS account to start tracking your goals and tasks'
                : 'Sign in to access your Personal AI OS dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-left block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your email"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSendingReset}
                      className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingReset ? 'Sending...' : 'Forgot?'}
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  minLength={6}
                />
              </div>

              {resetEmailSent && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    <strong>Check your email!</strong> We've sent a password reset link to{' '}
                    <strong>{email}</strong>. Please check your inbox and follow the instructions to
                    reset your password.
                  </AlertDescription>
                </Alert>
              )}

              {resetError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{resetError}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? isSignUp
                    ? 'Creating Account...'
                    : 'Signing In...'
                  : isSignUp
                    ? 'Create Account'
                    : 'Sign In'}
              </Button>
            </form>

            {/* Toggle between sign in and sign up */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What you&apos;ll get with your account:
          </h3>
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI-powered goal prioritization</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Smart task management</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Progress tracking & analytics</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Excel import & AI suggestions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
