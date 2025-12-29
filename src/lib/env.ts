import { z } from 'zod'

// Server-only environment variables (never exposed to client)
const serverEnvSchema = z.object({
  // Supabase Configuration (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Token Encryption
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(), // Legacy alias for TOKEN_ENCRYPTION_KEY
})

// Client-safe environment variables (can be exposed via NEXT_PUBLIC_*)
const clientEnvSchema = z.object({
  // Supabase Configuration (client-safe)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  // Stock Data API Configuration
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  IEX_CLOUD_API_KEY: z.string().optional(),
  FINANCIAL_MODELING_PREP_API_KEY: z.string().optional(),
  POLYGON_API_KEY: z.string().optional(),

  // Plaid Configuration (server-only, but defined here for validation)
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(), // Legacy - will use PLAID_SECRET_SANDBOX or PLAID_SECRET_PRODUCTION if set
  PLAID_SECRET_SANDBOX: z.string().optional(),
  PLAID_SECRET_PRODUCTION: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).optional(),
  PLAID_WEBHOOK_URL: z.string().url('Must be a valid URL').optional(),
  PLAID_REDIRECT_URI: z.string().url('Must be a valid URL').optional(),

  // Fitbit Configuration
  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),

  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  BUG_REPORT_EMAIL: z.string().email().optional(),

  // Next.js Configuration
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required').optional(),
  NEXTAUTH_URL: z.string().url('Must be a valid URL').optional(),
})

// Combined schema for validation
const envSchema = serverEnvSchema.merge(clientEnvSchema)

// Helper function to safely get and trim environment variables
function getEnv(key: string): string | undefined {
  const value = process.env[key]
  return value?.trim() || undefined
}

// Parse and validate environment variables
const parseEnv = () => {
  const plaidEnv = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox'

  // Auto-select Plaid secret based on environment
  const getPlaidSecret = () => {
    if (plaidEnv === 'production' && process.env.PLAID_SECRET_PRODUCTION) {
      return process.env.PLAID_SECRET_PRODUCTION.trim()
    }
    if (
      (plaidEnv === 'sandbox' || plaidEnv === 'development') &&
      process.env.PLAID_SECRET_SANDBOX
    ) {
      return process.env.PLAID_SECRET_SANDBOX.trim()
    }
    return process.env.PLAID_SECRET?.trim() || undefined
  }

  return envSchema.parse({
    // Server-only (never exposed to client)
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    TOKEN_ENCRYPTION_KEY: getEnv('TOKEN_ENCRYPTION_KEY') || getEnv('ENCRYPTION_KEY'),
    ENCRYPTION_KEY: getEnv('ENCRYPTION_KEY') || getEnv('TOKEN_ENCRYPTION_KEY'),

    // Client-safe (can be exposed)
    NEXT_PUBLIC_SUPABASE_URL: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    OPENAI_API_KEY: getEnv('OPENAI_API_KEY'),
    OPENAI_MODEL: getEnv('OPENAI_MODEL') || 'gpt-4o-mini',
    ALPHA_VANTAGE_API_KEY: getEnv('ALPHA_VANTAGE_API_KEY'),
    IEX_CLOUD_API_KEY: getEnv('IEX_CLOUD_API_KEY'),
    FINANCIAL_MODELING_PREP_API_KEY: getEnv('FINANCIAL_MODELING_PREP_API_KEY'),
    POLYGON_API_KEY: getEnv('POLYGON_API_KEY'),
    PLAID_CLIENT_ID: getEnv('PLAID_CLIENT_ID'),
    PLAID_SECRET: getPlaidSecret(),
    PLAID_SECRET_SANDBOX: getEnv('PLAID_SECRET_SANDBOX'),
    PLAID_SECRET_PRODUCTION: getEnv('PLAID_SECRET_PRODUCTION'),
    PLAID_ENV: plaidEnv,
    PLAID_WEBHOOK_URL: getEnv('PLAID_WEBHOOK_URL'),
    PLAID_REDIRECT_URI: getEnv('PLAID_REDIRECT_URI'),
    FITBIT_CLIENT_ID: getEnv('FITBIT_CLIENT_ID'),
    FITBIT_CLIENT_SECRET: getEnv('FITBIT_CLIENT_SECRET'),
    RESEND_API_KEY: getEnv('RESEND_API_KEY'),
    BUG_REPORT_EMAIL: getEnv('BUG_REPORT_EMAIL') || 'joeyhendrickson@me.com',
    NEXTAUTH_SECRET: getEnv('NEXTAUTH_SECRET'),
    NEXTAUTH_URL: getEnv('NEXTAUTH_URL'),
  })
}

// Validate environment variables with helpful error messages
export const env = (() => {
  try {
    return parseEnv()
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e) => e.path.join('.'))
      const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)

      console.error('❌ Environment variable validation failed:')
      console.error('Missing or invalid variables:', missingVars)
      console.error('Details:', errorMessages)

      // In development, throw helpful errors
      if (process.env.NODE_ENV === 'development') {
        throw new Error(
          `Environment variable validation failed:\n${errorMessages.join('\n')}\n\n` +
            'Please check your .env.local file and ensure all required variables are set.'
        )
      }

      // In production, log but don't crash (some vars are optional)
      console.warn('⚠️  Some environment variables are missing or invalid, but continuing...')
    }

    // Return parsed env even if validation fails (for optional vars)
    try {
      return parseEnv()
    } catch {
      // If parsing completely fails, return empty object
      return {} as z.infer<typeof envSchema>
    }
  }
})()

export type Env = z.infer<typeof envSchema>

// Server-only environment getter (ensures secrets never leak to client)
export function getServerEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() can only be called on the server')
  }

  return {
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    TOKEN_ENCRYPTION_KEY: env.TOKEN_ENCRYPTION_KEY || env.ENCRYPTION_KEY,
    PLAID_CLIENT_ID: env.PLAID_CLIENT_ID,
    PLAID_SECRET: env.PLAID_SECRET,
    PLAID_SECRET_SANDBOX: env.PLAID_SECRET_SANDBOX,
    PLAID_SECRET_PRODUCTION: env.PLAID_SECRET_PRODUCTION,
    PLAID_ENV: env.PLAID_ENV,
    PLAID_WEBHOOK_URL: env.PLAID_WEBHOOK_URL,
    PLAID_REDIRECT_URI: env.PLAID_REDIRECT_URI,
  }
}

// Validate required Plaid credentials with helpful error messages
export function validatePlaidConfig() {
  const errors: string[] = []

  if (!env.PLAID_CLIENT_ID) {
    errors.push('PLAID_CLIENT_ID is required')
  }

  const plaidEnv = env.PLAID_ENV || 'sandbox'
  if (plaidEnv === 'production' && !env.PLAID_SECRET_PRODUCTION) {
    errors.push('PLAID_SECRET_PRODUCTION is required when PLAID_ENV=production')
  } else if ((plaidEnv === 'sandbox' || plaidEnv === 'development') && !env.PLAID_SECRET_SANDBOX) {
    errors.push('PLAID_SECRET_SANDBOX is required when PLAID_ENV=sandbox or development')
  } else if (!env.PLAID_SECRET) {
    errors.push('PLAID_SECRET, PLAID_SECRET_SANDBOX, or PLAID_SECRET_PRODUCTION is required')
  }

  if (errors.length > 0) {
    throw new Error(`Plaid configuration error:\n${errors.join('\n')}`)
  }

  return true
}
