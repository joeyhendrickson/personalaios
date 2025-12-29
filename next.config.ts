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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.plaid.com https://*.plaid.io https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://*.plaid.com https://*.plaid.io",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https:",
              "connect-src 'self' https://*.plaid.com https://*.plaid.io https://www.google.com https://www.gstatic.com https://*.googleapis.com wss://www.walletlink.org wss://mainnet.infura.io https://*.seondnsresolve.com data:",
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
