'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getDefaultLayoutMode,
  persistLayoutMode,
  readStoredLayoutMode,
  type DashboardLayoutMode,
  type HomeTab,
} from '@/lib/dashboard/dashboard-layout'

export function useDashboardLayout() {
  const [layoutMode, setLayoutModeState] = useState<DashboardLayoutMode>(() =>
    getDefaultLayoutMode()
  )
  const [homeTab, setHomeTab] = useState<HomeTab>('today')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = readStoredLayoutMode()
    if (stored) setLayoutModeState(stored)
    setHydrated(true)
  }, [])

  const setLayoutMode = useCallback((mode: DashboardLayoutMode) => {
    setLayoutModeState(mode)
    persistLayoutMode(mode)
    if (mode === 'legacy') setHomeTab('today')
  }, [])

  const toggleLayoutMode = useCallback(() => {
    setLayoutMode(layoutMode === 'one-home' ? 'legacy' : 'one-home')
  }, [layoutMode, setLayoutMode])

  return {
    layoutMode,
    homeTab,
    setHomeTab,
    setLayoutMode,
    toggleLayoutMode,
    hydrated,
    isOneHome: layoutMode === 'one-home',
  }
}
