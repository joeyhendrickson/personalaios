'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Only create Supabase client in browser environment
  const supabase = typeof window !== 'undefined' ? createClient() : null

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      // Track sign-in for existing sessions (page loads)
      if (session?.user) {
        try {
          await fetch('/api/signin-streak/track', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Failed to track sign-in streak:', error)
          // Don't block auth flow if tracking fails
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // Track sign-in for streak trophies when user signs in
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await fetch('/api/signin-streak/track', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (error) {
          console.error('Failed to track sign-in streak:', error)
          // Don't block auth flow if tracking fails
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not available')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not available')
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase client not available')
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Redirect to homepage after sign out
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
