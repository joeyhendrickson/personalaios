'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Settings, ExternalLink } from 'lucide-react'

export function DevModeBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    // Only show in development mode and when services are not configured
    const isDev = process.env.NODE_ENV === 'development'

    // Check if services are properly configured
    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
    const hasSupabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'

    const isConfigured = hasSupabaseUrl && hasSupabaseKey

    setIsVisible(isDev && !isConfigured)
    setIsConfigured(!!isConfigured)
  }, [])

  if (!isVisible) return null

  return (
    <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
      <Settings className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex-1">
          <strong>Development Mode:</strong> Some services are not configured.
          {!isConfigured && (
            <span className="ml-2">
              To enable full functionality, please set up your environment variables.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/setup', '_blank')}
            className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Setup Guide
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-yellow-600 hover:bg-yellow-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
