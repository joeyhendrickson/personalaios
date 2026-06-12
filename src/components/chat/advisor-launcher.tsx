'use client'

import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'

type AdvisorLauncherProps = {
  onOpen: () => void
}

export function AdvisorLauncher({ onOpen }: AdvisorLauncherProps) {
  return (
    <Button
      type="button"
      onClick={onOpen}
      aria-label="Open AI Advisor"
      title="Open AI Advisor"
      className="pointer-events-auto fixed bottom-4 right-4 z-[9999] h-14 w-14 rounded-full bg-black shadow-lg hover:bg-gray-800"
    >
      <MessageSquare className="h-6 w-6 text-white" />
    </Button>
  )
}
