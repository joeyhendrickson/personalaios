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

// Initialize Plaid client
const configuration = new Configuration({
  basePath: getPlaidEnvironment(env.PLAID_ENV),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
  },
})

export const plaidClient = new PlaidApi(configuration)

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

    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Personal AI OS',
      products: [Products.Transactions, Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook:
        env.PLAID_WEBHOOK_URL ||
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/modules/budget-optimizer/plaid/webhook`,
    }

    try {
      const response = await plaidClient.linkTokenCreate(request)
      return response.data
    } catch (error: any) {
      console.error('Error creating link token:', error)

      // Extract detailed error information from Plaid API
      let errorMessage = 'Failed to create link token'
      if (error?.response?.data) {
        const plaidError = error.response.data
        errorMessage = `${errorMessage}: ${plaidError.error_message || plaidError.error_code || 'Unknown Plaid error'}`
        console.error('Plaid error details:', {
          error_code: plaidError.error_code,
          error_message: plaidError.error_message,
          error_type: plaidError.error_type,
          display_message: plaidError.display_message,
        })
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
      const response = await plaidClient.itemPublicTokenExchange({
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
      const response = await plaidClient.accountsGet({
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
      const response = await plaidClient.transactionsGet({
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
      const response = await plaidClient.transactionsSync({
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
      const response = await plaidClient.accountsBalanceGet({
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
      const response = await plaidClient.identityGet({
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
      const response = await plaidClient.itemRemove({
        access_token: accessToken,
      })
      return response.data
    } catch (error) {
      console.error('Error removing item:', error)
      throw new Error('Failed to remove item')
    }
  }
}
