/** Pull a readable message out of a googleapis / Gaxios error. */
export function googleApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      response?: {
        data?: {
          error?: {
            message?: string
            errors?: Array<{ message?: string }>
          }
        }
      }
    }
    const apiMsg = e.response?.data?.error?.message
    if (typeof apiMsg === 'string' && apiMsg.trim()) return apiMsg
    const nested = e.response?.data?.error?.errors?.[0]?.message
    if (typeof nested === 'string' && nested.trim()) return nested
    if (typeof e.message === 'string' && e.message.trim()) return e.message
  }
  if (error instanceof Error && error.message.trim()) return error.message
  return 'Failed to add calendar event'
}

export function httpSourceUrl(raw: string | undefined): string | undefined {
  const url = raw?.trim()
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
  } catch {
    /* ignore */
  }
  return undefined
}
