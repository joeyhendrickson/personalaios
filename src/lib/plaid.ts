import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  LinkTokenCreateRequest,
  CountryCode,
  Products,
} from 'plaid'
import { env } from './env'

// Initialize Plaid client
const configuration = new Configuration({
  basePath:
    env.PLAID_ENV === 'production'
      ? PlaidEnvironments.production
      : env.PLAID_ENV === 'development'
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox,
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
    if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
      throw new Error('Plaid credentials not configured')
    }

    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Personal AI OS',
      products: [Products.Transactions, Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/plaid/webhook`,
    }

    try {
      const response = await plaidClient.linkTokenCreate(request)
      return response.data
    } catch (error) {
      console.error('Error creating link token:', error)
      throw new Error('Failed to create link token')
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
   * Get transactions for a specific date range
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
