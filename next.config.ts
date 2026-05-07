import type { NextConfig } from 'next'

/**
 * If the console shows "Unsafe attempt to load URL https://vercel.live/... from frame with URL
 * chrome-error://chromewebdata/" — that is the Vercel Toolbar / Live feedback script running in
 * a bad parent (Chrome’s *error* document, e.g. after a failed load). It is not your app’s chat code.
 * To stop the script: Vercel → Project → Settings → General → Vercel Toolbar → Off (per environment),
 * or set env `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` for Preview (see Vercel docs).
 *
 * CSP below includes the full Vercel Toolbar allowlist (script/connect/img/style/font/frame) so
 * the toolbar can load when enabled; otherwise parts of it may be blocked.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply CSP headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.plaid.com https://*.plaid.io https://www.google.com https://www.gstatic.com https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://*.plaid.com https://*.plaid.io https://vercel.live",
              "img-src 'self' data: https: blob: https://vercel.live https://vercel.com",
              "media-src 'self' blob: data:",
              "font-src 'self' data: https: https://vercel.live https://assets.vercel.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.plaid.com https://*.plaid.io https://www.google.com https://www.gstatic.com https://*.googleapis.com https://api.elevenlabs.io https://api.openai.com wss://www.walletlink.org wss://mainnet.infura.io https://*.seondnsresolve.com https://vercel.live wss://*.pusher.com data:",
              "frame-src 'self' https://*.plaid.com https://*.plaid.io https://vercel.live https://*.vercel.live",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
