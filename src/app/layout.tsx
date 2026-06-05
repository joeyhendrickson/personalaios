import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './global.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ChatProvider } from '@/components/chat/chat-provider'
import { LanguageProvider } from '@/contexts/language-context'
import { ThemeProvider } from '@/contexts/theme-context'
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
  title: 'Life Stacks',
  description: 'Your personal productivity and goal tracking system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash of light mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('lifestacks-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <ChatProvider>
                  <DevModeBanner />
                  {children}
                </ChatProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
