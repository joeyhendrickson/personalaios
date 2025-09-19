import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './global.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ChatProvider } from '@/components/chat/chat-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { DevModeBanner } from '@/components/dev-mode-banner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Personal AI OS',
  description: 'Your personal productivity and goal tracking system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <ChatProvider>
              <DevModeBanner />
              {children}
            </ChatProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
