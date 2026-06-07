import type { NextRequest } from 'next/server'

/** Resolve the public site origin from a Next.js request (works on Vercel/local). */
export function getRequestOrigin(request: NextRequest | Request): string {
  if (request instanceof Request && 'nextUrl' in request) {
    const nextRequest = request as NextRequest
    if (nextRequest.nextUrl?.origin) return nextRequest.nextUrl.origin
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host.split(',')[0].trim()}`
  }

  try {
    return new URL(request.url).origin
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }
}
