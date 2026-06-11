'use client'

import { createContext, useContext } from 'react'
import type { OpenAdvisorDetail } from '@/lib/voice/advisor-events'

export interface ChatContextType {
  refreshGoals: () => void
  refreshTasks: () => void
  refreshDashboard: () => void
  wakeWordEnabled: boolean
  setWakeWordEnabled: (enabled: boolean) => void
  wakeWordSupported: boolean
  advisorExpanded: boolean
  setAdvisorExpanded: (expanded: boolean) => void
  openAdvisor: (detail?: OpenAdvisorDetail) => void
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
