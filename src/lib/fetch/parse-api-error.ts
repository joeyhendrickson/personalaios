/** Best-effort JSON error body from a failed fetch Response. */
export async function parseApiErrorResponse(
  response: Response,
  fallback = 'Request failed'
): Promise<string> {
  let bodyText = ''
  try {
    bodyText = await response.text()
  } catch {
    return `${fallback} (HTTP ${response.status})`
  }

  if (!bodyText.trim()) {
    return `${fallback} (HTTP ${response.status})`
  }

  try {
    const data = JSON.parse(bodyText) as {
      error?: string
      message?: string
      details?: unknown
    }

    const primary =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      fallback

    if (Array.isArray(data.details)) {
      const messages = data.details
        .map((item) => {
          if (typeof item === 'object' && item !== null && 'message' in item) {
            return String((item as { message: unknown }).message)
          }
          return null
        })
        .filter(Boolean)
      if (messages.length > 0) {
        return `${primary}: ${messages.join('; ')}`
      }
    }

    return primary
  } catch {
    return bodyText.slice(0, 200)
  }
}
