import { z } from 'zod'

const envSchema = z.object({
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  // Stock Data API Configuration
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  IEX_CLOUD_API_KEY: z.string().optional(),
  FINANCIAL_MODELING_PREP_API_KEY: z.string().optional(),
  POLYGON_API_KEY: z.string().optional(),

  // Plaid Configuration
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(), // Legacy - will use PLAID_SECRET_SANDBOX or PLAID_SECRET_PRODUCTION if set
  PLAID_SECRET_SANDBOX: z.string().optional(),
  PLAID_SECRET_PRODUCTION: z.string().optional(),
  PLAID_ENV: z.string().optional(),
  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),

  // Email Configuration
  RESEND_API_KEY: z.string().optional(),
  BUG_REPORT_EMAIL: z.string().email().optional(),

  // Next.js Configuration
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth secret is required').optional(),
  NEXTAUTH_URL: z.string().url('Must be a valid URL').optional(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() || undefined,
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY?.trim() || undefined,
  IEX_CLOUD_API_KEY: process.env.IEX_CLOUD_API_KEY?.trim() || undefined,
  FINANCIAL_MODELING_PREP_API_KEY: process.env.FINANCIAL_MODELING_PREP_API_KEY?.trim() || undefined,
  POLYGON_API_KEY: process.env.POLYGON_API_KEY?.trim() || undefined,
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID?.trim() || undefined,
  // Auto-select secret based on environment, with fallback to PLAID_SECRET
  PLAID_SECRET: (() => {
    const env = (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox'
    if (env === 'production' && process.env.PLAID_SECRET_PRODUCTION) {
      return process.env.PLAID_SECRET_PRODUCTION.trim()
    }
    if ((env === 'sandbox' || env === 'development') && process.env.PLAID_SECRET_SANDBOX) {
      return process.env.PLAID_SECRET_SANDBOX.trim()
    }
    return process.env.PLAID_SECRET?.trim() || undefined
  })(),
  PLAID_SECRET_SANDBOX: process.env.PLAID_SECRET_SANDBOX?.trim() || undefined,
  PLAID_SECRET_PRODUCTION: process.env.PLAID_SECRET_PRODUCTION?.trim() || undefined,
  PLAID_ENV: (process.env.PLAID_ENV as 'sandbox' | 'development' | 'production') || 'sandbox',
  RESEND_API_KEY: process.env.RESEND_API_KEY?.trim() || undefined,
  BUG_REPORT_EMAIL: process.env.BUG_REPORT_EMAIL?.trim() || 'joeyhendrickson@me.com',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
})

export type Env = z.infer<typeof envSchema>
