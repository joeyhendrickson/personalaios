'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'

interface ConnectBankButtonProps {
  onSuccess?: (connectionId: string, institutionName: string) => void
  onError?: (error: string) => void
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  children?: React.ReactNode
}

export function ConnectBankButton({
  onSuccess,
  onError,
  className,
  variant = 'default',
  size = 'default',
  children,
}: ConnectBankButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const createLinkToken = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/modules/budget-optimizer/plaid/create-link-token', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.details || errorData.error || 'Failed to create link token'
        throw new Error(errorMsg)
      }

      const data = await response.json()

      if (!data.link_token) {
        throw new Error(data.error || data.details || 'No link token received')
      }

      setLinkToken(data.link_token)
    } catch (error) {
      console.error('Error creating link token:', error)

      // Try to get error details from response if available
      let errorMessage = 'Failed to connect to Plaid'
      if (error instanceof Error) {
        errorMessage = error.message
      }

      onError?.(errorMessage)
      setIsLoading(false)
    }
  }

  const onPlaidSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      console.log('Plaid Link success!', metadata)
      setIsLoading(true)

      try {
        // Exchange public token for access token
        const response = await fetch('/api/modules/budget-optimizer/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution_name: metadata.institution?.name,
            institution_id: metadata.institution?.institution_id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          // Include detailed error message if available
          const errorMessage = errorData.message || errorData.error || 'Failed to exchange token'
          const errorDetails = errorData.details ? `: ${errorData.details}` : ''
          throw new Error(`${errorMessage}${errorDetails}`)
        }

        const data = await response.json()
        console.log('Token exchange successful:', data)

        // Call success callback with connection ID and institution name
        if (data.connection_id) {
          onSuccess?.(data.connection_id, metadata.institution?.name || 'Bank')
        }

        setLinkToken(null)
      } catch (error) {
        console.error('Error exchanging token:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to complete bank connection'
        onError?.(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess, onError]
  )

  const onPlaidExit = useCallback(
    (error: any, metadata: any) => {
      console.log('Plaid Link exited', error, metadata)
      setLinkToken(null)
      setIsLoading(false)

      if (error) {
        onError?.(error.display_message || error.error_message || 'Connection cancelled')
      }
    },
    [onError]
  )

  const config = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  }

  const { open, ready } = usePlaidLink(config)

  // Auto-open Plaid Link when token is ready
  useEffect(() => {
    if (ready && linkToken) {
      open()
    }
  }, [ready, linkToken, open])

  const handleClick = () => {
    if (!linkToken && !isLoading) {
      createLinkToken()
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || !!linkToken}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading || linkToken ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          {children || (
            <>
              <Plus className="h-4 w-4" />
              <span>Connect Bank Account</span>
            </>
          )}
        </>
      )}
    </Button>
  )
}
