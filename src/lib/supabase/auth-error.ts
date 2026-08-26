/** User-facing auth errors. Preview often lacks Production-only Supabase keys. */
export function publicAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : ''

  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV
  const isPreview = vercelEnv === 'preview'
  const looksLikeBadKey = /invalid api key/i.test(message)

  if (looksLikeBadKey && isPreview) {
    return [
      'This Preview deploy does not have a valid Supabase API key.',
      'In Vercel, open the personalaios project → Settings → Environment Variables.',
      'Enable NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Preview',
      '(same values as Production), then Redeploy this branch.',
      'Sign in on the personalaios preview URL, not the separate workspace project.',
    ].join(' ')
  }

  if (!message) return 'Invalid email or password'
  if (message === 'Supabase client not available' && isPreview) {
    return 'Supabase is not configured on this Preview deploy. Enable NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Preview in Vercel, then Redeploy.'
  }

  return message
}
