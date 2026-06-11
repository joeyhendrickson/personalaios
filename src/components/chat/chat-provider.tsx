'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChatInterface } from './chat-interface'
import { HeyLifestacksListener } from './hey-lifestacks-listener'
import { ChatContext, type ChatContextType } from './chat-context'
import { openLifestacksAdvisor } from '@/lib/voice/advisor-events'
import {
  isWakeWordSupported,
  readWakeWordEnabled,
  writeWakeWordEnabled,
} from '@/lib/voice/wake-word'

export { useChatContext } from './chat-context'

interface ChatProviderProps {
  children: React.ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [, setRefreshTrigger] = useState(0)
  const [wakeWordEnabled, setWakeWordEnabledState] = useState(false)
  const [wakeWordSupported, setWakeWordSupported] = useState(false)

  useEffect(() => {
    setWakeWordSupported(isWakeWordSupported())
    setWakeWordEnabledState(readWakeWordEnabled())
  }, [])

  const setWakeWordEnabled = useCallback((enabled: boolean) => {
    setWakeWordEnabledState(enabled)
    writeWakeWordEnabled(enabled)
  }, [])

  const refreshGoals = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    window.dispatchEvent(new CustomEvent('goals-refreshed'))
  }, [])

  const refreshTasks = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    window.dispatchEvent(new CustomEvent('tasks-refreshed'))
  }, [])

  const refreshDashboard = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    window.dispatchEvent(new CustomEvent('dashboard-refreshed'))
  }, [])

  const contextValue: ChatContextType = {
    refreshGoals,
    refreshTasks,
    refreshDashboard,
    wakeWordEnabled,
    setWakeWordEnabled,
    wakeWordSupported,
    openAdvisor: openLifestacksAdvisor,
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      <HeyLifestacksListener enabled={wakeWordEnabled} />
      <ChatInterface
        onGoalCreated={refreshGoals}
        onTaskCreated={refreshTasks}
        onTaskCompleted={refreshTasks}
      />
    </ChatContext.Provider>
  )
}
