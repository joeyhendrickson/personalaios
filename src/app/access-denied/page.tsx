'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center">
        <div className="mb-6">
          <ShieldOff className="h-20 w-20 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">
            Your access to Life Stacks has been temporarily disabled by an administrator.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">
            If you believe this is an error, please contact support at{' '}
            <a href="mailto:Joseph@SuddenImpactLabs.com" className="font-semibold underline">
              Joseph@SuddenImpactLabs.com
            </a>
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              // Sign out
              fetch('/api/auth/signout', { method: 'POST' }).then(
                () => (window.location.href = '/')
              )
            }}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            Sign Out
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
