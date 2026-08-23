import { describe, expect, it } from 'vitest'
import { googleApiErrorMessage, httpSourceUrl } from './google-api-error'

describe('googleApiErrorMessage', () => {
  it('reads the Calendar API error message', () => {
    expect(
      googleApiErrorMessage({
        message: 'Request failed',
        response: { data: { error: { message: 'Invalid source url: .' } } },
      })
    ).toBe('Invalid source url: .')
  })

  it('falls back to Error.message', () => {
    expect(googleApiErrorMessage(new Error('token expired'))).toBe('token expired')
  })
})

describe('httpSourceUrl', () => {
  it('accepts http(s) site URLs', () => {
    expect(httpSourceUrl('https://lifestacks.ai')).toBe('https://lifestacks.ai/')
  })

  it('rejects missing or non-http URLs so Google does not 400', () => {
    expect(httpSourceUrl(undefined)).toBeUndefined()
    expect(httpSourceUrl('')).toBeUndefined()
    expect(httpSourceUrl('lifestacks.ai')).toBeUndefined()
  })
})
