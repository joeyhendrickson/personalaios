'use client'

import { Button } from '@/components/ui/button'
import { WakeWordToggle } from '@/components/chat/wake-word-toggle'
import { useChatContext } from '@/components/chat/chat-context'
import { MessageSquare } from 'lucide-react'

type AdvisorLauncherProps = {
  onOpen: () => void
}

export function AdvisorLauncher({ onOpen }: AdvisorLauncherProps) {
  const { wakeWordEnabled, setWakeWordEnabled, wakeWordSupported } = useChatContext()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      <div className="pointer-events-auto rounded-lg border border-gray-200 bg-white/95 shadow-md px-3 py-2 dark:border-border dark:bg-card max-w-[min(100vw-2rem,20rem)]">
        <WakeWordToggle
          enabled={wakeWordEnabled}
          supported={wakeWordSupported}
          onChange={setWakeWordEnabled}
          compact
        />
      </div>
      <Button
        type="button"
        onClick={onOpen}
        aria-label="Open AI Advisor"
        title="Open AI Advisor"
        className="pointer-events-auto h-14 w-14 rounded-full bg-black shadow-lg hover:bg-gray-800"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
    </div>
  )
}
