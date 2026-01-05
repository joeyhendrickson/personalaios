import type { NextConfig } from 'next'

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
              "style-src 'self' 'unsafe-inline' https://*.plaid.com https://*.plaid.io",
              "img-src 'self' data: https: blob:",
              "media-src 'self' blob: data:",
              "font-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.plaid.com https://*.plaid.io https://www.google.com https://www.gstatic.com https://*.googleapis.com https://api.elevenlabs.io https://api.openai.com wss://www.walletlink.org wss://mainnet.infura.io https://*.seondnsresolve.com https://vercel.live data:",
              "frame-src 'self' https://*.plaid.com https://*.plaid.io",
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
