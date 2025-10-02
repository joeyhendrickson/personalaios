'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { ChatInterface } from './chat-interface'
import { useCurrentWeek } from '@/hooks/use-current-week'

interface ChatContextType {
  refreshGoals: () => void
  refreshTasks: () => void
  refreshDashboard: () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const { currentWeekId } = useCurrentWeek()
  const [, setRefreshTrigger] = useState(0)

  const refreshGoals = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    // Trigger a custom event that components can listen to
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
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      {currentWeekId && (
        <ChatInterface
          onGoalCreated={refreshGoals}
          onTaskCreated={refreshTasks}
          onTaskCompleted={refreshTasks}
        />
      )}
    </ChatContext.Provider>
  )
}
