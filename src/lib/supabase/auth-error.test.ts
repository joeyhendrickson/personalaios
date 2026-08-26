import { describe, expect, it } from 'vitest'
import { publicAuthErrorMessage } from './auth-error'

describe('publicAuthErrorMessage', () => {
  it('passes through normal supabase auth errors', () => {
    expect(publicAuthErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Invalid login credentials'
    )
  })

  it('explains Invalid API key on Preview deploys', () => {
    const previous = process.env.VERCEL_ENV
    process.env.VERCEL_ENV = 'preview'
    try {
      expect(publicAuthErrorMessage(new Error('Invalid API key'))).toContain(
        'Enable NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for Preview'
      )
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previous
    }
  })
})
