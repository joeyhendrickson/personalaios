'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'working' | 'error'

function parseHashParams(hash: string): Record<string, string> {
  const out: Record<string, string> = {}
  const clean = hash.startsWith('#') ? hash.slice(1) : hash
  for (const pair of clean.split('&')) {
    if (!pair) continue
    const [k, v] = pair.split('=')
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '')
  }
  return out
}

function ConfirmContent() {
  const [status, setStatus] = useState<Status>('working')
  const [message, setMessage] = useState('Confirming your account...')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const run = async () => {
      try {
        const supabase = createClient()

        const url = new URL(window.location.href)
        const hashParams = parseHashParams(window.location.hash)
        const errorDescription =
          hashParams.error_description || url.searchParams.get('error_description')
        if (errorDescription) {
          throw new Error(errorDescription)
        }

        const code = url.searchParams.get('code')
        const accessToken = hashParams.access_token
        const refreshToken = hashParams.refresh_token

        if (accessToken && refreshToken) {
          // Implicit flow (email confirmation returns tokens in the URL hash).
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        } else if (code) {
          // PKCE flow (?code=...).
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          // Maybe the session was already established (detectSessionInUrl).
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session) {
            throw new Error('No confirmation token found in the link.')
          }
        }

        // Clean the sensitive tokens out of the address bar.
        window.history.replaceState({}, document.title, '/auth/confirm')

        const type = hashParams.type || url.searchParams.get('type')
        if (type === 'recovery') {
          window.location.replace('/reset-password')
          return
        }

        // Route brand-new users into Dream Catcher; everyone else to the dashboard.
        let destination = '/dashboard'
        try {
          const res = await fetch('/api/assistant/onboarding/status', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            const onboardingStatus = data?.onboarding?.status
            if (data?.isEmptyDashboard && onboardingStatus !== 'completed') {
              destination = '/modules/dream-catcher?newUser=true'
            }
          }
        } catch {
          /* fall back to dashboard */
        }

        setMessage('Confirmed! Taking you in...')
        window.location.replace(destination)
      } catch (err) {
        console.error('Auth confirm error:', err)
        setStatus('error')
        setMessage(
          err instanceof Error
            ? err.message
            : 'We could not confirm your account. The link may have expired.'
        )
      }
    }

    void run()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full p-8 text-center">
        {status === 'working' ? (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Confirming your account</h1>
            <p className="text-sm text-gray-600">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmation link couldn&apos;t be processed
            </h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Go to sign in
              </Link>
              <Link
                href="/"
                className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
