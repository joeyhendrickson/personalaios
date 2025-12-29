import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest,
  CountryCode,
  Products,
} from 'plaid'
import { env, validatePlaidConfig } from './env'

/**
 * Safely maps PLAID_ENV string to PlaidEnvironments enum
 * @param plaidEnv - Environment string: 'production', 'development', or 'sandbox'
 * @returns PlaidEnvironments enum value
 */
function getPlaidEnvironment(plaidEnv?: string): string {
  switch (plaidEnv) {
    case 'production':
      return PlaidEnvironments.production
    case 'development':
      return PlaidEnvironments.development
    case 'sandbox':
      return PlaidEnvironments.sandbox
    default:
      // Default to sandbox for safety
      console.warn(`Invalid or missing PLAID_ENV (${plaidEnv}), defaulting to sandbox`)
      return PlaidEnvironments.sandbox
  }
}

// Initialize Plaid client (lazy initialization to ensure env vars are loaded)
let plaidClientInstance: PlaidApi | null = null

function getPlaidClient(): PlaidApi {
  if (!plaidClientInstance) {
    const plaidClientId = env.PLAID_CLIENT_ID
    const plaidSecret = env.PLAID_SECRET

    if (!plaidClientId || !plaidSecret) {
      throw new Error(
        'Plaid credentials not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET_PRODUCTION (or PLAID_SECRET_SANDBOX) in your environment variables.'
      )
    }

    const configuration = new Configuration({
      basePath: getPlaidEnvironment(env.PLAID_ENV),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': plaidClientId,
          'PLAID-SECRET': plaidSecret,
        },
      },
    })

    plaidClientInstance = new PlaidApi(configuration)
  }

  return plaidClientInstance
}

// Export for backward compatibility, but prefer using getPlaidClient() directly
export const plaidClient = getPlaidClient()

export class PlaidService {
  /**
   * Create a link token for the Link flow
   */
  static async createLinkToken(userId: string) {
    // Validate Plaid configuration
    try {
      validatePlaidConfig()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Plaid credentials not configured'
      console.error('Plaid configuration error:', errorMessage)
      throw new Error(errorMessage)
    }

    // Build webhook URL - only include if it's a valid URL
    // Plaid validates webhook delivery immediately, so URL must be:
    // - Valid HTTPS URL (or HTTP for localhost/sandbox)
    // - Not localhost (Plaid can't reach it)
    // - Accessible and returning 200 OK
    // - No auth required (Plaid sends no headers)
    let webhookUrl: string | undefined
    const plaidWebhookUrl = env.PLAID_WEBHOOK_URL?.trim()
    if (plaidWebhookUrl && plaidWebhookUrl.length > 0) {
      try {
        const url = new URL(plaidWebhookUrl)

        // Reject localhost - Plaid cannot reach localhost URLs
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.startsWith('192.168.')
        ) {
          console.warn(
            'PLAID_WEBHOOK_URL cannot be localhost - Plaid cannot reach it. Skipping webhook.'
          )
          webhookUrl = undefined
        } else if (
          url.protocol === 'https:' ||
          (url.protocol === 'http:' && env.PLAID_ENV !== 'production')
        ) {
          // HTTPS required for production, HTTP allowed for sandbox/development
          if (env.PLAID_ENV === 'production' && url.protocol !== 'https:') {
            console.warn('PLAID_WEBHOOK_URL must use HTTPS in production. Skipping webhook.')
            webhookUrl = undefined
          } else {
            webhookUrl = plaidWebhookUrl
            console.log('Using PLAID_WEBHOOK_URL:', webhookUrl)
          }
        } else {
          console.warn('PLAID_WEBHOOK_URL must use http:// or https:// protocol, skipping webhook')
          webhookUrl = undefined
        }
      } catch (error) {
        console.warn('Invalid PLAID_WEBHOOK_URL format, skipping webhook configuration:', error)
        webhookUrl = undefined
      }
    } else {
      // Fallback to constructed URL from NEXTAUTH_URL
      const nextAuthUrl = process.env.NEXTAUTH_URL?.trim()
      if (nextAuthUrl && nextAuthUrl.length > 0) {
        try {
          const baseUrl = new URL(nextAuthUrl)

          // Reject localhost - Plaid cannot reach localhost URLs
          if (
            baseUrl.hostname === 'localhost' ||
            baseUrl.hostname === '127.0.0.1' ||
            baseUrl.hostname.startsWith('192.168.')
          ) {
            console.warn(
              'NEXTAUTH_URL is localhost - cannot construct webhook URL. Plaid cannot reach localhost.'
            )
            webhookUrl = undefined
          } else {
            const constructedUrl = `${baseUrl.origin}/api/modules/budget-optimizer/plaid/webhook`
            new URL(constructedUrl) // Validate constructed URL
            webhookUrl = constructedUrl
            console.log('Using constructed webhook URL from NEXTAUTH_URL:', webhookUrl)
          }
        } catch (error) {
          console.warn('Invalid NEXTAUTH_URL, skipping webhook configuration:', error)
          webhookUrl = undefined
        }
      } else {
        console.log(
          'No webhook URL configured - proceeding without webhook (webhooks are optional)'
        )
        webhookUrl = undefined
      }
    }

    // Build request object - only include webhook if we have a valid URL
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Lifestacks.ai',
      products: [Products.Transactions], // Only Transactions product (Auth removed) - TOKEN_ENCRYPTION_KEY configured
      country_codes: [CountryCode.Us],
      language: 'en',
    }

    // Only add webhook if we have a valid, non-empty URL
    // Plaid will reject the request if webhook is provided but invalid
    if (webhookUrl && webhookUrl.length > 0) {
      // Double-check it's a valid URL before adding
      try {
        const testUrl = new URL(webhookUrl)
        if (testUrl.protocol === 'https:' || testUrl.protocol === 'http:') {
          request.webhook = webhookUrl
          console.log('Including webhook in link token request:', webhookUrl)
        } else {
          console.warn('Skipping webhook - invalid protocol:', testUrl.protocol)
        }
      } catch (error) {
        console.warn('Skipping webhook - failed URL validation:', error)
      }
    } else {
      console.log('No webhook included in link token request (webhooks are optional)')
    }

    try {
      const client = getPlaidClient()
      const response = await client.linkTokenCreate(request)
      return response.data
    } catch (error: any) {
      console.error('Error creating link token:', error)

      // Extract detailed error information from Plaid API
      let errorMessage = 'Failed to create link token'
      if (error?.response?.data) {
        const plaidError = error.response.data
        const plaidErrorMessage =
          plaidError.error_message || plaidError.error_code || 'Unknown Plaid error'
        errorMessage = `${errorMessage}: ${plaidErrorMessage}`

        console.error('Plaid error details:', {
          error_code: plaidError.error_code,
          error_message: plaidError.error_message,
          error_type: plaidError.error_type,
          display_message: plaidError.display_message,
          plaid_env: env.PLAID_ENV,
          has_client_id: !!env.PLAID_CLIENT_ID,
          has_secret: !!env.PLAID_SECRET,
          has_sandbox_secret: !!env.PLAID_SECRET_SANDBOX,
          has_production_secret: !!env.PLAID_SECRET_PRODUCTION,
        })

        // Provide helpful guidance for common errors
        if (
          plaidError.error_code === 'INVALID_CLIENT_ID' ||
          plaidError.error_code === 'INVALID_SECRET' ||
          plaidErrorMessage.includes('invalid client_id or secret')
        ) {
          const envType = env.PLAID_ENV || 'sandbox'
          const expectedSecret =
            envType === 'production' ? 'PLAID_SECRET_PRODUCTION' : 'PLAID_SECRET_SANDBOX'
          errorMessage = `Invalid Plaid credentials. Please verify:
- PLAID_CLIENT_ID is correct
- ${expectedSecret} is set correctly for ${envType} environment
- The credentials match your Plaid ${envType} dashboard
Current environment: ${envType}`
        }
      } else if (error?.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }

      throw new Error(errorMessage)
    }
  }

  /**
   * Exchange public token for access token
   */
  static async exchangePublicToken(publicToken: string) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.itemPublicTokenExchange({
        public_token: publicToken,
      })
      return response.data
    } catch (error) {
      console.error('Error exchanging public token:', error)
      throw new Error('Failed to exchange public token')
    }
  }

  /**
   * Get account information
   */
  static async getAccounts(accessToken: string) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.accountsGet({
        access_token: accessToken,
      })
      return response.data
    } catch (error) {
      console.error('Error getting accounts:', error)
      throw new Error('Failed to get accounts')
    }
  }

  /**
   * Get transactions for a specific date range (legacy method)
   */
  static async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    accountIds?: string[]
  ) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      })
      return response.data
    } catch (error) {
      console.error('Error getting transactions:', error)
      throw new Error('Failed to get transactions')
    }
  }

  /**
   * Sync transactions using Plaid's transactions/sync endpoint (recommended)
   * This method supports incremental syncing with cursors
   */
  static async syncTransactions(accessToken: string, cursor?: string | null) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
      })
      return response.data
    } catch (error: any) {
      console.error('Error syncing transactions:', error)

      // Handle specific Plaid errors
      if (error?.response?.data) {
        const plaidError = error.response.data
        const errorCode = plaidError.error_code

        // Map Plaid error codes to user-friendly messages
        if (errorCode === 'ITEM_LOGIN_REQUIRED') {
          throw new Error('ITEM_LOGIN_REQUIRED: User needs to re-authenticate with their bank')
        } else if (errorCode === 'INVALID_ACCESS_TOKEN') {
          throw new Error('INVALID_ACCESS_TOKEN: Access token is invalid or expired')
        } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('RATE_LIMIT_EXCEEDED: Too many requests, please try again later')
        }

        throw new Error(
          `Plaid API error: ${plaidError.error_message || plaidError.error_code || 'Unknown error'}`
        )
      }

      throw new Error('Failed to sync transactions')
    }
  }

  /**
   * Get account balances
   */
  static async getBalances(accessToken: string) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.accountsBalanceGet({
        access_token: accessToken,
      })
      return response.data
    } catch (error) {
      console.error('Error getting balances:', error)
      throw new Error('Failed to get balances')
    }
  }

  /**
   * Get identity information
   */
  static async getIdentity(accessToken: string) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.identityGet({
        access_token: accessToken,
      })
      return response.data
    } catch (error) {
      console.error('Error getting identity:', error)
      throw new Error('Failed to get identity')
    }
  }

  /**
   * Remove an item (disconnect bank account)
   */
  static async removeItem(accessToken: string) {
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    try {
      const client = getPlaidClient()
      const response = await client.itemRemove({
        access_token: accessToken,
      })
      return response.data
    } catch (error) {
      console.error('Error removing item:', error)
      throw new Error('Failed to remove item')
    }
  }
}
