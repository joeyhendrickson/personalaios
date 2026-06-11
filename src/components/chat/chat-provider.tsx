'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ChatInterface } from './chat-interface'
import { HeyLifestacksListener } from './hey-lifestacks-listener'
import { AdvisorLauncher } from './advisor-launcher'
import { ChatContext, type ChatContextType } from './chat-context'
import {
  LIFESTACKS_OPEN_ADVISOR_EVENT,
  openLifestacksAdvisor,
  type OpenAdvisorDetail,
} from '@/lib/voice/advisor-events'
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
  const [advisorExpanded, setAdvisorExpanded] = useState(false)
  const pendingOpenRef = useRef<OpenAdvisorDetail | null>(null)

  useEffect(() => {
    setWakeWordSupported(isWakeWordSupported())
    setWakeWordEnabledState(readWakeWordEnabled())
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      pendingOpenRef.current = (event as CustomEvent<OpenAdvisorDetail>).detail ?? {}
      setAdvisorExpanded(true)
    }
    window.addEventListener(LIFESTACKS_OPEN_ADVISOR_EVENT, handler)
    return () => window.removeEventListener(LIFESTACKS_OPEN_ADVISOR_EVENT, handler)
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

  const openAdvisor = useCallback((detail: OpenAdvisorDetail = {}) => {
    openLifestacksAdvisor(detail)
  }, [])

  const contextValue: ChatContextType = {
    refreshGoals,
    refreshTasks,
    refreshDashboard,
    wakeWordEnabled,
    setWakeWordEnabled,
    wakeWordSupported,
    advisorExpanded,
    setAdvisorExpanded,
    openAdvisor,
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      <HeyLifestacksListener enabled={wakeWordEnabled} />
      {!advisorExpanded && <AdvisorLauncher onOpen={() => setAdvisorExpanded(true)} />}
      <ChatInterface
        isExpanded={advisorExpanded}
        onExpandedChange={setAdvisorExpanded}
        pendingOpenRef={pendingOpenRef}
        onGoalCreated={refreshGoals}
        onTaskCreated={refreshTasks}
        onTaskCompleted={refreshTasks}
      />
    </ChatContext.Provider>
  )
}
